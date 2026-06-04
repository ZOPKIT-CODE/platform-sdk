import type { OutboxStore, OutboxRow } from './types';
import type { BusinessEventPublisher } from '../events/sns-publisher';
import type { BusinessEvent } from '../events/envelope';

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
 * them to the business-events SNS topic, then marks them as published (ADR-009).
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
export function createOutboxPoller(
  store: OutboxStore,
  publisher: BusinessEventPublisher,
  config: OutboxPollerConfig = {},
): { start: () => void; stop: () => void } {
  const intervalMs = config.intervalMs ?? 1000;
  const batchSize = config.batchSize ?? 100;
  const maxConsecutiveFailures = config.maxConsecutiveFailures ?? 5;
  const backoffMs = config.backoffMs ?? 30_000;
  const log = config.logger ?? {
    info: (msg: string, meta?: Record<string, unknown>) =>
      console.log(`[sdk:outbox] ${msg}`, meta ?? ''),
    error: (msg: string, meta?: Record<string, unknown>) =>
      console.error(`[sdk:outbox] ${msg}`, meta ?? ''),
  };

  let timer: ReturnType<typeof setInterval> | null = null;
  let consecutiveFailures = 0;
  let inBackoff = false;

  async function pollOnce(): Promise<void> {
    if (inBackoff) return;

    let rows: OutboxRow[];
    try {
      rows = await store.getUnpublished(batchSize);
    } catch (err) {
      log.error('Failed to fetch unpublished outbox rows', { error: String(err) });
      return;
    }

    if (rows.length === 0) return;

    const published: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    // SNS PublishBatch accepts up to 10 entries per call.
    // publishBatch() handles the chunking internally; results are returned in
    // the same order as the input events array.
    const events = rows.map((row) => row.payload as BusinessEvent);
    const results = await publisher.publishBatch(events);

    let batchHadFailure = false;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = results[i];
      if (result.success) {
        published.push(row.id);
      } else {
        batchHadFailure = true;
        failed.push({ id: row.id, reason: result.error?.message ?? 'publish failed' });
        log.error('Failed to publish outbox row', {
          outboxId: row.id,
          eventType: row.eventType,
          error: result.error?.message,
        });
      }
    }

    if (batchHadFailure) {
      consecutiveFailures++;
      if (consecutiveFailures >= maxConsecutiveFailures) {
        log.error(`${consecutiveFailures} consecutive failures — backing off for ${backoffMs}ms`);
        inBackoff = true;
        setTimeout(() => {
          inBackoff = false;
          consecutiveFailures = 0;
        }, backoffMs);
      }
    } else {
      consecutiveFailures = 0;
    }

    if (published.length > 0) {
      try {
        await store.markPublished(published);
        log.info(`Published ${published.length} outbox events`);
      } catch (err) {
        log.error('Failed to mark outbox rows as published', { error: String(err) });
      }
    }

    for (const { id, reason } of failed) {
      try {
        await store.markFailed(id, reason);
      } catch {
        // Non-fatal
      }
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(() => {
        pollOnce().catch((err) => log.error('Unexpected poll error', { error: String(err) }));
      }, intervalMs);
      log.info('Outbox poller started', { intervalMs, batchSize });
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      log.info('Outbox poller stopped');
    },
  };
}
