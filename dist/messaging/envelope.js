"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNSEnvelopeParseError = void 0;
exports.parseSNSEnvelope = parseSNSEnvelope;
const registry_1 = require("../events/registry");
/** Discriminated error class so callers can branch on `instanceof`. */
class SNSEnvelopeParseError extends Error {
    constructor(stage, message) {
        super(message);
        this.name = 'SNSEnvelopeParseError';
        this.stage = stage;
    }
}
exports.SNSEnvelopeParseError = SNSEnvelopeParseError;
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
function parseSNSEnvelope(rawMessageBody) {
    // ── Step 1: parse outer body ────────────────────────────────────────────
    let outer;
    try {
        outer = JSON.parse(rawMessageBody);
    }
    catch (err) {
        throw new SNSEnvelopeParseError('outer-json', `Message body is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    // ── Step 2: detect SNS wrapper ──────────────────────────────────────────
    let candidate = outer;
    let wasSNSWrapped = false;
    if (outer !== null &&
        typeof outer === 'object' &&
        outer.Type === 'Notification' &&
        typeof outer.Message === 'string') {
        wasSNSWrapped = true;
        const innerRaw = outer.Message;
        try {
            candidate = JSON.parse(innerRaw);
        }
        catch (err) {
            throw new SNSEnvelopeParseError('sns-message-json', `SNS Message field is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    // ── Step 3: validate against the envelope schema ────────────────────────
    const result = registry_1.EventEnvelope.safeParse(candidate);
    if (!result.success) {
        throw new SNSEnvelopeParseError('envelope-validation', `Envelope failed schema validation: ${result.error.message}`);
    }
    return { envelope: result.data, wasSNSWrapped };
}
//# sourceMappingURL=envelope.js.map