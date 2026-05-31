"use strict";
/**
 * Outbox pattern interfaces (ADR-009).
 *
 * The SDK defines the contract; each application provides its own Drizzle
 * implementation so the SDK has no direct database dependency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTBOX_SCHEMA_SQL = void 0;
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
exports.OUTBOX_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL,
  tenant_id     UUID,
  payload       JSONB NOT NULL,
  published     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  failure_count INT NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outbox_unpublished_idx
  ON outbox (published, created_at)
  WHERE published = FALSE;
`.trim();
//# sourceMappingURL=types.js.map