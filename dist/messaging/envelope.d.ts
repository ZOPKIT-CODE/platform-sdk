import { EventEnvelope } from '../events/registry';
/**
 * Shared SNS → EventEnvelope parser.
 *
 * Consolidates the ~50 lines of SNS envelope handling that was previously
 * duplicated across wrapper, crm, and accounting. Today every app
 * re-implements this: `JSON.parse(body)` → maybe unwrap `Type=Notification`
 * → `JSON.parse(Message)` → validate. This module is the single source of
 * truth for that flow.
 */
export interface ParseSNSEnvelopeResult {
    /** The validated event envelope. */
    envelope: EventEnvelope;
    /**
     * True if the input was wrapped in an SNS `{Type:'Notification',Message}`
     * structure. False if the input was a raw event JSON. Useful for telemetry
     * (e.g. spot misconfigured publishers that bypass SNS).
     */
    wasSNSWrapped: boolean;
}
/** Discriminated error class so callers can branch on `instanceof`. */
export declare class SNSEnvelopeParseError extends Error {
    readonly stage: 'outer-json' | 'sns-message-json' | 'envelope-validation';
    constructor(stage: 'outer-json' | 'sns-message-json' | 'envelope-validation', message: string);
}
/**
 * Parse a raw SQS/SNS message body into an `EventEnvelope`.
 *
 * Handles two on-the-wire shapes:
 *   1. Raw event JSON (publisher sent straight to SQS, or `RawMessageDelivery`
 *      is enabled on the SNS subscription).
 *   2. SNS-wrapped notification: `{ Type: 'Notification', Message: '<json>' }`
 *      — the `Message` field is parsed as the inner envelope.
 *
 * Throws `SNSEnvelopeParseError` if neither shape matches or if the resulting
 * envelope fails Zod validation.
 */
export declare function parseSNSEnvelope(rawMessageBody: string): ParseSNSEnvelopeResult;
//# sourceMappingURL=envelope.d.ts.map