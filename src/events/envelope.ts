import { z } from 'zod';

export const APP_CODES = ['wrapper', 'crm', 'fa', 'hrms', 'pm'] as const;
export type AppCode = (typeof APP_CODES)[number];

export const BusinessEventSchema = z.object({
  /** Unique to this specific event emission — used for deduplication (ADR-010). */
  messageId: z.string().uuid(),

  /**
   * Copied unchanged across the entire saga chain (ADR-011).
   * Ties all related events together for distributed tracing.
   */
  correlationId: z.string().uuid(),

  /**
   * The messageId of the event that directly caused this one to be emitted (ADR-012).
   * Empty string for events initiated by direct user action (no parent event).
   */
  causationId: z.string(),

  /** Which application emitted this event. */
  sourceSystem: z.enum(APP_CODES),

  /** Wrapper tenant UUID. All per-tenant events carry this. */
  tenantId: z.string().uuid(),

  /** Dot-notation event name e.g. 'crm.invoice.created' */
  eventType: z.string().min(1),

  /** Semver of this event's payload schema — used for forward-compatible upconversion. */
  schemaVersion: z.string().default('1.0'),

  /** ISO 8601 UTC timestamp of when the event was created by the publisher. */
  timestamp: z.string().datetime(),

  /** Event-specific payload. Validated against the per-event Zod schema at the consumer. */
  payload: z.record(z.unknown()),
});

export type BusinessEvent<T = Record<string, unknown>> = Omit<
  z.infer<typeof BusinessEventSchema>,
  'payload'
> & { payload: T };

/** Create a typed BusinessEvent with all envelope fields populated. */
export function createEvent<T extends Record<string, unknown>>(
  fields: Omit<BusinessEvent<T>, 'timestamp' | 'schemaVersion'> & {
    schemaVersion?: string;
  },
): BusinessEvent<T> {
  return {
    schemaVersion: '1.0',
    ...fields,
    timestamp: new Date().toISOString(),
  };
}
