/**
 * Idempotency tracker — two-layer deduplication (ADR-010).
 *
 * Layer 1: FIFO SQS deduplication (5-minute window, handled at infrastructure level).
 * Layer 2: This module — DB-backed unique constraint on (messageId, tenantId, eventType).
 *          Covers DLQ redrives, visibility-timeout re-deliveries, and anything that
 *          bypasses the 5-minute FIFO window.
 *
 * The SDK defines ONLY the `IdempotencyStore` contract; each application owns
 * its ledger table, Drizzle implementation and migrations, and the live schemas
 * have deliberately diverged: CRM uses `processed_events` (event_id PK +
 * 3-state machine; renamed from processed_mq_events in CRM migration 0043),
 * while FA and OM keep their own `processed_mq_events` tables in their own
 * databases. A canonical DDL string (`IDEMPOTENCY_SCHEMA_SQL`) used to live
 * here, but it described a schema no application actually had and nothing ever
 * executed it — removed 2026-10-07 so it cannot mislead a future change into
 * "re-aligning" an app with a fiction.
 */
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
