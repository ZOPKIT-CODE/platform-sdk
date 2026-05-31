"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePlatformBusMessage = parsePlatformBusMessage;
const crypto_1 = require("crypto");
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
function parsePlatformBusMessage(rawBody, sqsMessageId) {
    // ── Step 1: Parse outer SQS body ────────────────────────────────────────
    let outer;
    try {
        outer = JSON.parse(rawBody);
    }
    catch {
        throw new Error('SQS body is not valid JSON');
    }
    // ── Step 2: SNS envelope unwrap ──────────────────────────────────────────
    let rawJson;
    if (outer !== null &&
        typeof outer === 'object' &&
        outer.Type === 'Notification' &&
        typeof outer.Message === 'string') {
        rawJson = outer.Message;
    }
    else {
        rawJson = rawBody;
    }
    let raw;
    try {
        raw = JSON.parse(rawJson);
    }
    catch {
        throw new Error('SNS Message payload is not valid JSON');
    }
    // ── Step 3: Recursively parse double-encoded eventData ───────────────────
    if (raw.eventData && typeof raw.eventData === 'string') {
        try {
            raw.eventData = JSON.parse(raw.eventData);
        }
        catch {
            // keep as-is if second parse fails
        }
    }
    // ── Step 4: Normalize eventType ──────────────────────────────────────────
    if (typeof raw.eventType === 'string') {
        let et = raw.eventType;
        const parts = et.split('.');
        // Strip app prefixes sent by the Wrapper (wrapper.* or crm.*)
        if (parts.length > 1 && (parts[0] === 'wrapper' || parts[0] === 'crm')) {
            et = parts.slice(1).join('.');
        }
        // Convert underscore-separated names to dot notation when no dot present
        if (et.includes('_') && !et.includes('.'))
            et = et.replace(/_/g, '.');
        // Canonicalize org.* → organization.*
        if (et.startsWith('org.'))
            et = `organization.${et.slice(4)}`;
        raw.eventType = et;
    }
    // ── Step 5: Merge eventData fields into top-level (handler back-compat) ──
    if (raw.eventData && typeof raw.eventData === 'object') {
        for (const k of Object.keys(raw.eventData)) {
            if (!(k in raw))
                raw[k] = raw.eventData[k];
        }
    }
    // ── Step 6: Backfill ADR-011 envelope fields ─────────────────────────────
    const eventType = typeof raw.eventType === 'string' ? raw.eventType : 'unknown';
    const hasEventId = typeof raw.eventId === 'string' && raw.eventId.length > 0;
    const eventId = hasEventId
        ? raw.eventId
        : `mq_${sqsMessageId}_${eventType}`;
    if (!hasEventId) {
        console.warn(`[parsePlatformBusMessage] Missing eventId — using sqsMessageId fallback:` +
            ` sqsMessageId=${sqsMessageId} eventType=${eventType}`);
    }
    const envelope = {
        ...raw,
        eventId,
        messageId: typeof raw.messageId === 'string' ? raw.messageId : sqsMessageId,
        correlationId: typeof raw.correlationId === 'string' ? raw.correlationId : (0, crypto_1.randomUUID)(),
        causationId: typeof raw.causationId === 'string' ? raw.causationId : eventId,
        sourceSystem: typeof raw.sourceSystem === 'string' ? raw.sourceSystem : 'wrapper',
        schemaVersion: typeof raw.schemaVersion === 'string' ? raw.schemaVersion : '1.0',
        eventType,
        tenantId: typeof raw.tenantId === 'string' ? raw.tenantId : '',
        timestamp: typeof raw.timestamp === 'string'
            ? raw.timestamp
            : new Date().toISOString(),
        payload: raw.payload != null &&
            typeof raw.payload === 'object' &&
            !Array.isArray(raw.payload)
            ? raw.payload
            : {},
    };
    return envelope;
}
//# sourceMappingURL=parse.js.map