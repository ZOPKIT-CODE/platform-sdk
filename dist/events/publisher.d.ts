import { z } from 'zod';
import type { BusinessEvent } from './envelope';
import type { OutboxStore } from '../outbox/types';
export interface EventBridgePublisherConfig {
    /** The EventBridge custom bus name or ARN (e.g. 'business-events'). */
    eventBusName: string;
    /** AWS region. Defaults to AWS_REGION env var. */
    region?: string;
    /**
     * Optional outbox store. When provided, events are written to the outbox
     * within the calling transaction and the poller delivers them asynchronously
     * (ADR-009). When omitted, events are published inline — use only for
     * fire-and-forget non-financial events.
     */
    outbox?: OutboxStore;
}
export interface PublishResult {
    success: boolean;
    messageId?: string;
    error?: Error;
    /** true if the event was queued to the outbox rather than published directly */
    queued?: boolean;
}
export declare class EventBridgePublisher {
    private readonly config;
    private readonly client;
    constructor(config: EventBridgePublisherConfig);
    /**
     * Publish a business event.
     *
     * If an outbox store is configured (recommended for all financial events),
     * the event is written to the outbox and this method returns immediately —
     * the outbox poller delivers it asynchronously with at-least-once guarantees.
     *
     * Without an outbox, the event is published directly to EventBridge.
     */
    publish<T extends Record<string, unknown>>(event: BusinessEvent<T>): Promise<PublishResult>;
    /** Publish directly to EventBridge — used by the outbox poller. */
    publishDirect<T extends Record<string, unknown>>(event: BusinessEvent<T>): Promise<PublishResult>;
    /**
     * Publish a batch of events (max 10 per EventBridge PutEvents call).
     * Returns per-event results in the same order as the input.
     */
    publishBatch<T extends Record<string, unknown>>(events: BusinessEvent<T>[]): Promise<PublishResult[]>;
}
/** Parse an inbound EventBridge event detail string back into a BusinessEvent. */
export declare function parseEventBridgeDetail(detail: string): BusinessEvent;
/** Validate a BusinessEvent's payload against the schema registry. */
export declare function validateEventPayload(event: BusinessEvent, schemas: Record<string, z.ZodTypeAny>): {
    valid: boolean;
    error?: z.ZodError;
};
//# sourceMappingURL=publisher.d.ts.map