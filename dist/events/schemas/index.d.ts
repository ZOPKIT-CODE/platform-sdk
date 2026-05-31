export * from './platform-bus';
export * from './business-bus';
import type { z } from 'zod';
export declare const ALL_EVENT_SCHEMAS: Record<string, z.ZodTypeAny>;
/** Look up the Zod schema for a given eventType. Returns undefined for unknown types. */
export declare function getEventSchema(eventType: string): z.ZodTypeAny | undefined;
//# sourceMappingURL=index.d.ts.map