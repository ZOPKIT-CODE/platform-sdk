import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import { BusinessEventSchema, type BusinessEvent } from './envelope';
import { getEventSchema } from './schemas';
import type { IdempotencyStore } from '../idempotency/tracker';

export interface SQSConsumerConfig {
  queueUrl: string;
  dlqUrl?: string;
  region?: string;
  /** Max messages per poll. Default 10 (SQS max). */
  maxMessages?: number;
  /** Long-poll wait time in seconds. Default 20. */
  waitTimeSeconds?: number;
  /** Visibility timeout in seconds. Default 60. Must exceed max handler duration. */
  visibilityTimeout?: number;
  /** Extend visibility every N seconds when handler is running. Default 30. */
  heartbeatIntervalSeconds?: number;
  /** Idempotency store — required for production use. */
  idempotency?: IdempotencyStore;
  /** Optional structured logger. Defaults to console. */
  logger?: Logger;
}

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export type EventHandler = (event: BusinessEvent) => Promise<void>;

/** Result returned by the consumer for each processed message. */
export interface ProcessResult {
  messageId: string;
  eventType: string;
  status: 'processed' | 'duplicate' | 'invalid' | 'failed';
  durationMs: number;
  error?: string;
}

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
export function createSQSConsumer(
  config: SQSConsumerConfig,
  handler: EventHandler,
): { start: () => Promise<void>; stop: () => void } {
  const client = new SQSClient({ region: config.region ?? process.env.AWS_REGION });
  const log: Logger = config.logger ?? consoleLogger();

  const maxMessages = config.maxMessages ?? 10;
  const waitTimeSeconds = config.waitTimeSeconds ?? 20;
  const visibilityTimeout = config.visibilityTimeout ?? 60;
  const heartbeatInterval = config.heartbeatIntervalSeconds ?? 30;

  let running = false;
  let stopRequested = false;

  async function processMessage(msg: Message): Promise<ProcessResult> {
    const start = Date.now();
    const receiptHandle = msg.ReceiptHandle!;

    // Unwrap SNS envelope if present
    let rawBody: string = msg.Body ?? '';
    try {
      const outer = JSON.parse(rawBody) as Record<string, unknown>;
      if (outer.Type === 'Notification' && typeof outer.Message === 'string') {
        rawBody = outer.Message;
      }
    } catch {
      // Not JSON or not SNS envelope — treat as raw
    }

    // Parse and validate the BusinessEvent envelope
    let event: BusinessEvent;
    try {
      const parsed = JSON.parse(rawBody);
      const result = BusinessEventSchema.safeParse(parsed);
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
      event = result.data as BusinessEvent;
    } catch (err) {
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
    const payloadSchema = getEventSchema(event.eventType);
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
      const alreadyProcessed = await config.idempotency.markProcessed(
        event.messageId,
        event.tenantId,
        event.eventType,
      );
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
        await client.send(
          new ChangeMessageVisibilityCommand({
            QueueUrl: config.queueUrl,
            ReceiptHandle: receiptHandle,
            VisibilityTimeout: visibilityTimeout,
          }),
        );
      } catch {
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
    } catch (err) {
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

  async function pollOnce(): Promise<ProcessResult[]> {
    const response = await client.send(
      new ReceiveMessageCommand({
        QueueUrl: config.queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        VisibilityTimeout: visibilityTimeout,
        MessageAttributeNames: ['All'],
      }),
    );

    const messages = response.Messages ?? [];
    if (messages.length === 0) return [];

    return Promise.all(messages.map((msg) => processMessage(msg)));
  }

  async function start(): Promise<void> {
    if (running) return;
    running = true;
    stopRequested = false;
    log.info('SQS consumer started', { queueUrl: config.queueUrl });

    while (!stopRequested) {
      try {
        await pollOnce();
      } catch (err) {
        log.error('Poll error — retrying in 5s', { error: String(err) });
        await sleep(5000);
      }
    }

    running = false;
    log.info('SQS consumer stopped');
  }

  function stop(): void {
    stopRequested = true;
  }

  return { start, stop };
}

async function deleteMessage(
  client: SQSClient,
  queueUrl: string,
  receiptHandle: string,
): Promise<void> {
  await client.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function consoleLogger(): Logger {
  return {
    info: (msg, meta) => console.log(`[sdk:consumer] ${msg}`, meta ?? ''),
    warn: (msg, meta) => console.warn(`[sdk:consumer] ${msg}`, meta ?? ''),
    error: (msg, meta) => console.error(`[sdk:consumer] ${msg}`, meta ?? ''),
  };
}
