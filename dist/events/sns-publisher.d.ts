import type { BusinessEvent } from './envelope';
import type { OutboxStore } from '../outbox/types';
export interface SnsPublisherConfig {
    /** The business-events SNS topic ARN (e.g. arn:aws:sns:…:business-events). */
    topicArn: string;
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
/**
 * Interface implemented by event publishers. The outbox poller depends on this
 * (not a concrete class) so any transport-specific publisher can be plugged in.
 */
export interface BusinessEventPublisher {
    publishDirect<T extends Record<string, unknown>>(event: BusinessEvent<T>): Promise<PublishResult>;
    publishBatch<T extends Record<string, unknown>>(events: BusinessEvent<T>[]): Promise<PublishResult[]>;
}
/**
 * Publishes business events to the `business-events` SNS topic (replaces the
 * former EventBridge bus). Mirrors the previous publisher's API so callers and
 * the outbox poller are unchanged apart from the config shape.
 */
export declare class SnsPublisher implements BusinessEventPublisher {
    private readonly config;
    private readonly client;
    constructor(config: SnsPublisherConfig);
    /**
     * Publish a business event. With an outbox configured (recommended for all
     * financial events) the event is written to the outbox and delivered
     * asynchronously by the poller; otherwise it is published inline.
     */
    publish<T extends Record<string, unknown>>(event: BusinessEvent<T>): Promise<PublishResult>;
    /** Publish directly to SNS — used inline and by the outbox poller. */
    publishDirect<T extends Record<string, unknown>>(event: BusinessEvent<T>): Promise<PublishResult>;
    /**
     * Publish a batch of events (max 10 per SNS PublishBatch call). Returns
     * per-event results in the same order as the input.
     */
    publishBatch<T extends Record<string, unknown>>(events: BusinessEvent<T>[]): Promise<PublishResult[]>;
}
//# sourceMappingURL=sns-publisher.d.ts.map