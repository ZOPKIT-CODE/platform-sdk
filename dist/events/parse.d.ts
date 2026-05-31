/**
 * Normalized, ADR-011-compliant platform bus event envelope.
 * Returned by parsePlatformBusMessage() after SNS unwrap, double-decode,
 * eventType normalization, and field backfill.
 */
export interface PlatformBusEnvelope {
    eventId: string;
    messageId: string;
    correlationId: string;
    causationId: string;
    sourceSystem: string;
    tenantId: string;
    eventType: string;
    schemaVersion: string;
    timestamp: string;
    payload: Record<string, unknown>;
    eventData?: Record<string, unknown>;
    [key: string]: unknown;
}
/**
 * Parse a raw SQS message body into a normalized PlatformBusEnvelope.
 *
 * Handles:
 *  1. JSON.parse of raw SQS body.
 *  2. SNS envelope unwrap (Type === 'Notification' → unwrap .Message).
 *  3. Double-encoded eventData (string → JSON.parse).
 *  4. eventType normalization:
 *       - strip leading 'wrapper.' or 'crm.' prefix
 *       - underscore → dot when no dot present
 *       - 'org.' prefix → 'organization.'
 *  5. Merge eventData fields into top-level envelope (handler back-compat).
 *  6. Backfill ADR-011 fields with sensible defaults for legacy events.
 *
 * Throws Error with a descriptive message on parse failure.
 */
export declare function parsePlatformBusMessage(rawBody: string, sqsMessageId: string): PlatformBusEnvelope;
//# sourceMappingURL=parse.d.ts.map