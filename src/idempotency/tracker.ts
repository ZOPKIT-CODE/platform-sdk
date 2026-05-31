/**
 * Idempotency tracker — two-layer deduplication (ADR-010).
 *
 * Layer 1: FIFO SQS deduplication (5-minute window, handled at infrastructure level).
 * Layer 2: This module — DB-backed unique constraint on (messageId, tenantId, eventType).
 *          Covers DLQ redrives, visibility-timeout re-deliveries, and anything that
 *          bypasses the 5-minute FIFO window.
 *
 * The SDK defines the contract; each application provides its own Drizzle implementation.
 *
 * Canonical SQL schema (apply in each consuming application):
 * ```sql
 * CREATE TABLE IF NOT EXISTS processed_mq_events (
 *   id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   message_id TEXT NOT NULL,
 *   tenant_id  UUID,
 *   event_type TEXT NOT NULL,
 *   processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   CONSTRAINT processed_mq_events_unique UNIQUE (message_id, tenant_id, event_type)
 * );
 * -- Auto-expire rows older than 30 days (safe margin over 14-day DLQ retention)
 * CREATE INDEX IF NOT EXISTS processed_mq_events_expire_idx
 *   ON processed_mq_events (processed_at);
 * ```
 */
export const IDEMPOTENCY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS processed_mq_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   TEXT NOT NULL,
  tenant_id    UUID,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT processed_mq_events_unique UNIQUE (message_id, tenant_id, event_type)
);

CREATE INDEX IF NOT EXISTS processed_mq_events_expire_idx
  ON processed_mq_events (processed_at);
`.trim();

export interface IdempotencyStore {
  /**
   * Attempt to record this message as processed.
   *
   * Returns `true` if this is the first time the message is seen (proceed with handling).
   * Returns `false` if it is a duplicate (skip — already processed).
   *
   * Implementation must use a unique constraint on (messageId, tenantId, eventType)
   * so concurrent duplicate deliveries are safe. Catch the unique-violation error
   * and return `false`.
   */
  markProcessed(messageId: string, tenantId: string, eventType: string): Promise<boolean>;

  /** Check without inserting — useful for observability / admin endpoints. */
  isProcessed(messageId: string, tenantId: string, eventType: string): Promise<boolean>;

  /** Purge records older than the given date (for the nightly cleanup job). */
  purgeOlderThan(date: Date): Promise<number>;
}

/**
 * In-memory idempotency store for testing only.
 * DO NOT use in production — state is lost on restart.
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly seen = new Set<string>();

  private key(messageId: string, tenantId: string, eventType: string): string {
    return `${messageId}::${tenantId}::${eventType}`;
  }

  async markProcessed(messageId: string, tenantId: string, eventType: string): Promise<boolean> {
    const k = this.key(messageId, tenantId, eventType);
    if (this.seen.has(k)) return false;
    this.seen.add(k);
    return true;
  }

  async isProcessed(messageId: string, tenantId: string, eventType: string): Promise<boolean> {
    return this.seen.has(this.key(messageId, tenantId, eventType));
  }

  async purgeOlderThan(_date: Date): Promise<number> {
    return 0;
  }
}
