"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEventPayload = validateEventPayload;
/**
 * Transport-agnostic helpers for business events.
 *
 * Publishing lives in `./sns-publisher` (SnsPublisher → the `business-events`
 * SNS topic). The former EventBridge publisher was removed when the business
 * bus moved to SNS/SQS.
 */
/** Validate a BusinessEvent's payload against the schema registry. */
function validateEventPayload(event, schemas) {
    const schema = schemas[event.eventType];
    if (!schema)
        return { valid: true }; // unknown types pass through
    const result = schema.safeParse(event.payload);
    return result.success ? { valid: true } : { valid: false, error: result.error };
}
//# sourceMappingURL=publisher.js.map