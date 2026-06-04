"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnsPublisher = void 0;
const client_sns_1 = require("@aws-sdk/client-sns");
const trace_context_1 = require("./trace-context");
/**
 * MessageAttributes carried on every business event:
 *   - eventType / sourceSystem / tenantId → drive SNS subscription FILTER POLICIES
 *     (consumers subscribe to only the events they care about) and the in-app
 *     loop-guard (sourceSystem != self).
 *   - sentry-trace / baggage / traceparent → distributed tracing (injected).
 * Subscriptions use raw message delivery, so the SQS body is the BusinessEvent
 * JSON and these attributes survive to the consumer.
 */
function buildMessageAttributes(event) {
    const attrs = {
        eventType: { DataType: 'String', StringValue: event.eventType },
        sourceSystem: { DataType: 'String', StringValue: event.sourceSystem },
        tenantId: { DataType: 'String', StringValue: event.tenantId },
    };
    (0, trace_context_1.injectTraceContext)(attrs);
    return attrs;
}
/**
 * Publishes business events to the `business-events` SNS topic (replaces the
 * former EventBridge bus). Mirrors the previous publisher's API so callers and
 * the outbox poller are unchanged apart from the config shape.
 */
class SnsPublisher {
    constructor(config) {
        this.config = config;
        this.client = new client_sns_1.SNSClient({ region: config.region ?? process.env.AWS_REGION });
    }
    /**
     * Publish a business event. With an outbox configured (recommended for all
     * financial events) the event is written to the outbox and delivered
     * asynchronously by the poller; otherwise it is published inline.
     */
    async publish(event) {
        if (this.config.outbox) {
            await this.config.outbox.enqueue({
                id: event.messageId,
                eventType: event.eventType,
                tenantId: event.tenantId,
                payload: event,
            });
            return { success: true, messageId: event.messageId, queued: true };
        }
        return this.publishDirect(event);
    }
    /** Publish directly to SNS — used inline and by the outbox poller. */
    async publishDirect(event) {
        try {
            const result = await this.client.send(new client_sns_1.PublishCommand({
                TopicArn: this.config.topicArn,
                Message: JSON.stringify(event),
                MessageAttributes: buildMessageAttributes(event),
            }));
            return { success: true, messageId: result.MessageId };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }
    /**
     * Publish a batch of events (max 10 per SNS PublishBatch call). Returns
     * per-event results in the same order as the input.
     */
    async publishBatch(events) {
        if (events.length === 0)
            return [];
        const chunks = chunkArray(events, 10);
        const results = [];
        for (const chunk of chunks) {
            const entries = chunk.map((ev, i) => ({
                Id: String(i),
                Message: JSON.stringify(ev),
                MessageAttributes: buildMessageAttributes(ev),
            }));
            try {
                const response = await this.client.send(new client_sns_1.PublishBatchCommand({ TopicArn: this.config.topicArn, PublishBatchRequestEntries: entries }));
                const ok = new Map((response.Successful ?? []).map((s) => [s.Id, s.MessageId]));
                const failedIds = new Set((response.Failed ?? []).map((f) => f.Id));
                const failedMsg = new Map((response.Failed ?? []).map((f) => [f.Id, f.Message ?? 'SNS rejected entry']));
                for (let i = 0; i < chunk.length; i++) {
                    const id = String(i);
                    if (failedIds.has(id)) {
                        results.push({ success: false, error: new Error(failedMsg.get(id)) });
                    }
                    else {
                        results.push({ success: true, messageId: ok.get(id) });
                    }
                }
            }
            catch (err) {
                for (const _ev of chunk) {
                    results.push({ success: false, error: err instanceof Error ? err : new Error(String(err)) });
                }
            }
        }
        return results;
    }
}
exports.SnsPublisher = SnsPublisher;
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
//# sourceMappingURL=sns-publisher.js.map