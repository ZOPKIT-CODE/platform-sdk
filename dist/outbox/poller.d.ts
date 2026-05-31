import type { OutboxStore } from './types';
import type { EventBridgePublisher } from '../events/publisher';
export interface OutboxPollerConfig {
    /** How often to poll in milliseconds. Default 1000 (1 second). */
    intervalMs?: number;
    /** Max rows to fetch per poll cycle. Default 100. */
    batchSize?: number;
    /** Max consecutive publish failures before backing off. Default 5. */
    maxConsecutiveFailures?: number;
    /** Backoff delay after maxConsecutiveFailures is reached (ms). Default 30000. */
    backoffMs?: number;
    logger?: {
        info(msg: string, meta?: Record<string, unknown>): void;
        error(msg: string, meta?: Record<string, unknown>): void;
    };
}
/**
 * Outbox poller — reads unpublished rows from the outbox table and publishes
 * them to EventBridge, then marks them as published (ADR-009).
 *
 * The caller is responsible for running this in a background process. It
 * should start with the application server and stop on SIGTERM.
 *
 * @example
 * ```ts
 * const poller = createOutboxPoller(store, publisher, { intervalMs: 1000 });
 * poller.start();
 * process.on('SIGTERM', () => poller.stop());
 * ```
 */
export declare function createOutboxPoller(store: OutboxStore, publisher: EventBridgePublisher, config?: OutboxPollerConfig): {
    start: () => void;
    stop: () => void;
};
//# sourceMappingURL=poller.d.ts.map