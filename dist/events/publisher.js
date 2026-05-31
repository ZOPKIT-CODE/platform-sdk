"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBridgePublisher = void 0;
exports.parseEventBridgeDetail = parseEventBridgeDetail;
exports.validateEventPayload = validateEventPayload;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
class EventBridgePublisher {
    constructor(config) {
        this.config = config;
        this.client = new client_eventbridge_1.EventBridgeClient({ region: config.region ?? process.env.AWS_REGION });
    }
    /**
     * Publish a business event.
     *
     * If an outbox store is configured (recommended for all financial events),
     * the event is written to the outbox and this method returns immediately —
     * the outbox poller delivers it asynchronously with at-least-once guarantees.
     *
     * Without an outbox, the event is published directly to EventBridge.
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
    /** Publish directly to EventBridge — used by the outbox poller. */
    async publishDirect(event) {
        const entry = {
            EventBusName: this.config.eventBusName,
            Source: `zopkit.${event.sourceSystem}`,
            DetailType: event.eventType,
            Detail: JSON.stringify(event),
            Time: new Date(event.timestamp),
        };
        try {
            const result = await this.client.send(new client_eventbridge_1.PutEventsCommand({ Entries: [entry] }));
            const failed = result.FailedEntryCount ?? 0;
            if (failed > 0) {
                const err = new Error(`EventBridge rejected event: ${result.Entries?.[0]?.ErrorMessage ?? 'unknown'}`);
                return { success: false, error: err };
            }
            return { success: true, messageId: result.Entries?.[0]?.EventId };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }
    /**
     * Publish a batch of events (max 10 per EventBridge PutEvents call).
     * Returns per-event results in the same order as the input.
     */
    async publishBatch(events) {
        if (events.length === 0)
            return [];
        const chunks = chunkArray(events, 10);
        const results = [];
        for (const chunk of chunks) {
            const entries = chunk.map((ev) => ({
                EventBusName: this.config.eventBusName,
                Source: `zopkit.${ev.sourceSystem}`,
                DetailType: ev.eventType,
                Detail: JSON.stringify(ev),
                Time: new Date(ev.timestamp),
            }));
            try {
                const response = await this.client.send(new client_eventbridge_1.PutEventsCommand({ Entries: entries }));
                const evbEntries = response.Entries ?? [];
                for (let i = 0; i < chunk.length; i++) {
                    const entry = evbEntries[i];
                    if (entry?.EventId) {
                        results.push({ success: true, messageId: entry.EventId });
                    }
                    else {
                        results.push({
                            success: false,
                            error: new Error(entry?.ErrorMessage ?? 'EventBridge rejected entry'),
                        });
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
exports.EventBridgePublisher = EventBridgePublisher;
/** Parse an inbound EventBridge event detail string back into a BusinessEvent. */
function parseEventBridgeDetail(detail) {
    const parsed = JSON.parse(detail);
    if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('EventBridge detail is not an object');
    }
    return parsed;
}
/** Validate a BusinessEvent's payload against the schema registry. */
function validateEventPayload(event, schemas) {
    const schema = schemas[event.eventType];
    if (!schema)
        return { valid: true }; // unknown types pass through
    const result = schema.safeParse(event.payload);
    return result.success ? { valid: true } : { valid: false, error: result.error };
}
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
//# sourceMappingURL=publisher.js.map