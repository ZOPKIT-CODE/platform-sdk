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
export class SNSEnvelopeParseError extends Error {
  readonly stage:
    | 'outer-json'
    | 'sns-message-json'
    | 'envelope-validation';

  constructor(
    stage: 'outer-json' | 'sns-message-json' | 'envelope-validation',
    message: string,
  ) {
    super(message);
    this.name = 'SNSEnvelopeParseError';
    this.stage = stage;
  }
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
export function parseSNSEnvelope(rawMessageBody: string): ParseSNSEnvelopeResult {
  // ── Step 1: parse outer body ────────────────────────────────────────────
  let outer: unknown;
  try {
    outer = JSON.parse(rawMessageBody);
  } catch (err) {
    throw new SNSEnvelopeParseError(
      'outer-json',
      `Message body is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Step 2: detect SNS wrapper ──────────────────────────────────────────
  let candidate: unknown = outer;
  let wasSNSWrapped = false;

  if (
    outer !== null &&
    typeof outer === 'object' &&
    (outer as Record<string, unknown>).Type === 'Notification' &&
    typeof (outer as Record<string, unknown>).Message === 'string'
  ) {
    wasSNSWrapped = true;
    const innerRaw = (outer as Record<string, unknown>).Message as string;
    try {
      candidate = JSON.parse(innerRaw);
    } catch (err) {
      throw new SNSEnvelopeParseError(
        'sns-message-json',
        `SNS Message field is not valid JSON: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ── Step 3: validate against the envelope schema ────────────────────────
  const result = EventEnvelope.safeParse(candidate);
  if (!result.success) {
    throw new SNSEnvelopeParseError(
      'envelope-validation',
      `Envelope failed schema validation: ${result.error.message}`,
    );
  }

  return { envelope: result.data, wasSNSWrapped };
}
