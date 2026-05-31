import { type BusinessEvent } from './envelope';
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
export declare function createSQSConsumer(config: SQSConsumerConfig, handler: EventHandler): {
    start: () => Promise<void>;
    stop: () => void;
};
//# sourceMappingURL=consumer.d.ts.map