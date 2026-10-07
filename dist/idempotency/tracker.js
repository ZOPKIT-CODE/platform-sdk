"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryIdempotencyStore = void 0;
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
/**
 * In-memory idempotency store for testing only.
 * DO NOT use in production — state is lost on restart.
 */
class InMemoryIdempotencyStore {
    constructor() {
        this.seen = new Set();
    }
    key(messageId, tenantId, eventType) {
        return `${messageId}::${tenantId}::${eventType}`;
    }
    async markProcessed(messageId, tenantId, eventType) {
        const k = this.key(messageId, tenantId, eventType);
        if (this.seen.has(k))
            return false;
        this.seen.add(k);
        return true;
    }
    async isProcessed(messageId, tenantId, eventType) {
        return this.seen.has(this.key(messageId, tenantId, eventType));
    }
    async purgeOlderThan(_date) {
        return 0;
    }
}
exports.InMemoryIdempotencyStore = InMemoryIdempotencyStore;
//# sourceMappingURL=tracker.js.map