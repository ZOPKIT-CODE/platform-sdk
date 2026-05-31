export * from './platform-bus';
export * from './business-bus';

import { PLATFORM_BUS_SCHEMAS } from './platform-bus';
import { BUSINESS_BUS_SCHEMAS } from './business-bus';
import type { z } from 'zod';

export const ALL_EVENT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  ...PLATFORM_BUS_SCHEMAS,
  ...BUSINESS_BUS_SCHEMAS,
};

/** Look up the Zod schema for a given eventType. Returns undefined for unknown types. */
export function getEventSchema(eventType: string): z.ZodTypeAny | undefined {
  return ALL_EVENT_SCHEMAS[eventType];
}
