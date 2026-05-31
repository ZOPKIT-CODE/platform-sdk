/**
 * Outbox pattern interfaces (ADR-009).
 *
 * The SDK defines the contract; each application provides its own Drizzle
 * implementation so the SDK has no direct database dependency.
 */
export interface OutboxRow {
    id: string;
    eventType: string;
    tenantId: string | null;
    payload: Record<string, unknown>;
    failureReason?: string | null;
}
export interface OutboxEnqueueInput {
    id: string;
    eventType: string;
    tenantId: string | null;
    payload: Record<string, unknown>;
}
export interface OutboxStore {
    /**
     * Write an event to the outbox table within the caller's existing DB
     * transaction. The SDK never manages transactions — that is the caller's
     * responsibility to ensure atomicity.
     */
    enqueue(row: OutboxEnqueueInput): Promise<void>;
    /** Fetch up to `limit` unpublished rows ordered by created_at ASC. */
    getUnpublished(limit: number): Promise<OutboxRow[]>;
    /** Mark the given IDs as successfully published. */
    markPublished(ids: string[]): Promise<void>;
    /** Record a publish failure for a single row (for monitoring). */
    markFailed(id: string, reason: string): Promise<void>;
}
/**
 * Canonical SQL schema for the outbox table.
 * Apply this migration in each application that publishes to the event bus.
 *
 * @example
 * ```sql
 * -- In your Drizzle migration:
 * CREATE TABLE outbox (
 *   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   event_type    TEXT NOT NULL,
 *   tenant_id     UUID,
 *   payload       JSONB NOT NULL,
 *   published     BOOLEAN NOT NULL DEFAULT FALSE,
 *   published_at  TIMESTAMPTZ,
 *   failure_count INT NOT NULL DEFAULT 0,
 *   last_error    TEXT,
 *   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * CREATE INDEX ON outbox (published, created_at) WHERE published = FALSE;
 * ```
 */
export declare const OUTBOX_SCHEMA_SQL: string;
//# sourceMappingURL=types.d.ts.map