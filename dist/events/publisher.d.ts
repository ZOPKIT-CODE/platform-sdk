import { z } from 'zod';
import type { BusinessEvent } from './envelope';
/**
 * Transport-agnostic helpers for business events.
 *
 * Publishing lives in `./sns-publisher` (SnsPublisher → the `business-events`
 * SNS topic). The former EventBridge publisher was removed when the business
 * bus moved to SNS/SQS.
 */
/** Validate a BusinessEvent's payload against the schema registry. */
export declare function validateEventPayload(event: BusinessEvent, schemas: Record<string, z.ZodTypeAny>): {
    valid: boolean;
    error?: z.ZodError;
};
//# sourceMappingURL=publisher.d.ts.map