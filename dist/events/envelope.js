"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessEventSchema = exports.APP_CODES = void 0;
exports.createEvent = createEvent;
const zod_1 = require("zod");
exports.APP_CODES = ['wrapper', 'crm', 'fa', 'hrms', 'pm'];
exports.BusinessEventSchema = zod_1.z.object({
    /** Unique to this specific event emission — used for deduplication (ADR-010). */
    messageId: zod_1.z.string().uuid(),
    /**
     * Copied unchanged across the entire saga chain (ADR-011).
     * Ties all related events together for distributed tracing.
     */
    correlationId: zod_1.z.string().uuid(),
    /**
     * The messageId of the event that directly caused this one to be emitted (ADR-012).
     * Empty string for events initiated by direct user action (no parent event).
     */
    causationId: zod_1.z.string(),
    /** Which application emitted this event. */
    sourceSystem: zod_1.z.enum(exports.APP_CODES),
    /** Wrapper tenant UUID. All per-tenant events carry this. */
    tenantId: zod_1.z.string().uuid(),
    /** Dot-notation event name e.g. 'crm.invoice.created' */
    eventType: zod_1.z.string().min(1),
    /** Semver of this event's payload schema — used for forward-compatible upconversion. */
    schemaVersion: zod_1.z.string().default('1.0'),
    /** ISO 8601 UTC timestamp of when the event was created by the publisher. */
    timestamp: zod_1.z.string().datetime(),
    /** Event-specific payload. Validated against the per-event Zod schema at the consumer. */
    payload: zod_1.z.record(zod_1.z.unknown()),
});
/** Create a typed BusinessEvent with all envelope fields populated. */
function createEvent(fields) {
    return {
        schemaVersion: '1.0',
        ...fields,
        timestamp: new Date().toISOString(),
    };
}
//# sourceMappingURL=envelope.js.map