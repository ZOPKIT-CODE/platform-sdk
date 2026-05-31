import { z } from 'zod';
export declare const APP_CODES: readonly ["wrapper", "crm", "fa", "hrms", "pm"];
export type AppCode = (typeof APP_CODES)[number];
export declare const BusinessEventSchema: z.ZodObject<{
    /** Unique to this specific event emission — used for deduplication (ADR-010). */
    messageId: z.ZodString;
    /**
     * Copied unchanged across the entire saga chain (ADR-011).
     * Ties all related events together for distributed tracing.
     */
    correlationId: z.ZodString;
    /**
     * The messageId of the event that directly caused this one to be emitted (ADR-012).
     * Empty string for events initiated by direct user action (no parent event).
     */
    causationId: z.ZodString;
    /** Which application emitted this event. */
    sourceSystem: z.ZodEnum<["wrapper", "crm", "fa", "hrms", "pm"]>;
    /** Wrapper tenant UUID. All per-tenant events carry this. */
    tenantId: z.ZodString;
    /** Dot-notation event name e.g. 'crm.invoice.created' */
    eventType: z.ZodString;
    /** Semver of this event's payload schema — used for forward-compatible upconversion. */
    schemaVersion: z.ZodDefault<z.ZodString>;
    /** ISO 8601 UTC timestamp of when the event was created by the publisher. */
    timestamp: z.ZodString;
    /** Event-specific payload. Validated against the per-event Zod schema at the consumer. */
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    messageId: string;
    correlationId: string;
    causationId: string;
    sourceSystem: "wrapper" | "crm" | "fa" | "hrms" | "pm";
    tenantId: string;
    eventType: string;
    schemaVersion: string;
    timestamp: string;
    payload: Record<string, unknown>;
}, {
    messageId: string;
    correlationId: string;
    causationId: string;
    sourceSystem: "wrapper" | "crm" | "fa" | "hrms" | "pm";
    tenantId: string;
    eventType: string;
    timestamp: string;
    payload: Record<string, unknown>;
    schemaVersion?: string | undefined;
}>;
export type BusinessEvent<T = Record<string, unknown>> = Omit<z.infer<typeof BusinessEventSchema>, 'payload'> & {
    payload: T;
};
/** Create a typed BusinessEvent with all envelope fields populated. */
export declare function createEvent<T extends Record<string, unknown>>(fields: Omit<BusinessEvent<T>, 'timestamp' | 'schemaVersion'> & {
    schemaVersion?: string;
}): BusinessEvent<T>;
//# sourceMappingURL=envelope.d.ts.map