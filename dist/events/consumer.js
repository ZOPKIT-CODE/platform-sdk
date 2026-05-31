"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSQSConsumer = createSQSConsumer;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const envelope_1 = require("./envelope");
const schemas_1 = require("./schemas");
/**
 * SQS consumer base — long-polling, idempotency, SNS envelope unwrapping,
 * Zod validation, visibility heartbeat, and graceful shutdown.
 *
 * Usage:
 * ```ts
 * const consumer = createSQSConsumer(config, async (event) => {
 *   await handlerRegistry[event.eventType]?.(event);
 * });
 * await consumer.start();
 * ```
 */
function createSQSConsumer(config, handler) {
    const client = new client_sqs_1.SQSClient({ region: config.region ?? process.env.AWS_REGION });
    const log = config.logger ?? consoleLogger();
    const maxMessages = config.maxMessages ?? 10;
    const waitTimeSeconds = config.waitTimeSeconds ?? 20;
    const visibilityTimeout = config.visibilityTimeout ?? 60;
    const heartbeatInterval = config.heartbeatIntervalSeconds ?? 30;
    let running = false;
    let stopRequested = false;
    async function processMessage(msg) {
        const start = Date.now();
        const receiptHandle = msg.ReceiptHandle;
        // Unwrap SNS envelope if present
        let rawBody = msg.Body ?? '';
        try {
            const outer = JSON.parse(rawBody);
            if (outer.Type === 'Notification' && typeof outer.Message === 'string') {
                rawBody = outer.Message;
            }
        }
        catch {
            // Not JSON or not SNS envelope — treat as raw
        }
        // Parse and validate the BusinessEvent envelope
        let event;
        try {
            const parsed = JSON.parse(rawBody);
            const result = envelope_1.BusinessEventSchema.safeParse(parsed);
            if (!result.success) {
                log.warn('Invalid event envelope — sending to DLQ', {
                    sqsMessageId: msg.MessageId,
                    error: result.error.message,
                });
                return {
                    messageId: msg.MessageId ?? '',
                    eventType: 'unknown',
                    status: 'invalid',
                    durationMs: Date.now() - start,
                    error: result.error.message,
                };
            }
            event = result.data;
        }
        catch (err) {
            log.error('Failed to parse message body', {
                sqsMessageId: msg.MessageId,
                error: String(err),
            });
            return {
                messageId: msg.MessageId ?? '',
                eventType: 'unknown',
                status: 'invalid',
                durationMs: Date.now() - start,
                error: String(err),
            };
        }
        // Validate payload against schema registry
        const payloadSchema = (0, schemas_1.getEventSchema)(event.eventType);
        if (payloadSchema) {
            const payloadResult = payloadSchema.safeParse(event.payload);
            if (!payloadResult.success) {
                log.warn('Event payload schema validation failed', {
                    eventType: event.eventType,
                    messageId: event.messageId,
                    error: payloadResult.error.message,
                });
                // Still process — don't lose events over optional fields, but warn loudly
            }
        }
        // Idempotency check (ADR-010 Layer 2)
        if (config.idempotency) {
            const alreadyProcessed = await config.idempotency.markProcessed(event.messageId, event.tenantId, event.eventType);
            if (!alreadyProcessed) {
                log.info('Duplicate event — skipping', {
                    messageId: event.messageId,
                    eventType: event.eventType,
                });
                await deleteMessage(client, config.queueUrl, receiptHandle);
                return {
                    messageId: event.messageId,
                    eventType: event.eventType,
                    status: 'duplicate',
                    durationMs: Date.now() - start,
                };
            }
        }
        // Heartbeat — extend visibility while handler is running
        const heartbeat = setInterval(async () => {
            try {
                await client.send(new client_sqs_1.ChangeMessageVisibilityCommand({
                    QueueUrl: config.queueUrl,
                    ReceiptHandle: receiptHandle,
                    VisibilityTimeout: visibilityTimeout,
                }));
            }
            catch {
                // Non-fatal — handler will still complete
            }
        }, heartbeatInterval * 1000);
        try {
            await handler(event);
            clearInterval(heartbeat);
            await deleteMessage(client, config.queueUrl, receiptHandle);
            return {
                messageId: event.messageId,
                eventType: event.eventType,
                status: 'processed',
                durationMs: Date.now() - start,
            };
        }
        catch (err) {
            clearInterval(heartbeat);
            log.error('Handler failed — message will be retried or sent to DLQ', {
                messageId: event.messageId,
                eventType: event.eventType,
                error: String(err),
            });
            // Do NOT delete — SQS will make it visible again after timeout
            return {
                messageId: event.messageId,
                eventType: event.eventType,
                status: 'failed',
                durationMs: Date.now() - start,
                error: String(err),
            };
        }
    }
    async function pollOnce() {
        const response = await client.send(new client_sqs_1.ReceiveMessageCommand({
            QueueUrl: config.queueUrl,
            MaxNumberOfMessages: maxMessages,
            WaitTimeSeconds: waitTimeSeconds,
            VisibilityTimeout: visibilityTimeout,
            MessageAttributeNames: ['All'],
        }));
        const messages = response.Messages ?? [];
        if (messages.length === 0)
            return [];
        return Promise.all(messages.map((msg) => processMessage(msg)));
    }
    async function start() {
        if (running)
            return;
        running = true;
        stopRequested = false;
        log.info('SQS consumer started', { queueUrl: config.queueUrl });
        while (!stopRequested) {
            try {
                await pollOnce();
            }
            catch (err) {
                log.error('Poll error — retrying in 5s', { error: String(err) });
                await sleep(5000);
            }
        }
        running = false;
        log.info('SQS consumer stopped');
    }
    function stop() {
        stopRequested = true;
    }
    return { start, stop };
}
async function deleteMessage(client, queueUrl, receiptHandle) {
    await client.send(new client_sqs_1.DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }));
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function consoleLogger() {
    return {
        info: (msg, meta) => console.log(`[sdk:consumer] ${msg}`, meta ?? ''),
        warn: (msg, meta) => console.warn(`[sdk:consumer] ${msg}`, meta ?? ''),
        error: (msg, meta) => console.error(`[sdk:consumer] ${msg}`, meta ?? ''),
    };
}
//# sourceMappingURL=consumer.js.map