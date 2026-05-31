import {
  EventBridgeClient,
  PutEventsCommand,
  type PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import { z } from 'zod';
import type { BusinessEvent } from './envelope';
import type { OutboxStore } from '../outbox/types';

export interface EventBridgePublisherConfig {
  /** The EventBridge custom bus name or ARN (e.g. 'business-events'). */
  eventBusName: string;
  /** AWS region. Defaults to AWS_REGION env var. */
  region?: string;
  /**
   * Optional outbox store. When provided, events are written to the outbox
   * within the calling transaction and the poller delivers them asynchronously
   * (ADR-009). When omitted, events are published inline — use only for
   * fire-and-forget non-financial events.
   */
  outbox?: OutboxStore;
}

export interface PublishResult {
  success: boolean;
  messageId?: string;
  error?: Error;
  /** true if the event was queued to the outbox rather than published directly */
  queued?: boolean;
}

export class EventBridgePublisher {
  private readonly client: EventBridgeClient;

  constructor(private readonly config: EventBridgePublisherConfig) {
    this.client = new EventBridgeClient({ region: config.region ?? process.env.AWS_REGION });
  }

  /**
   * Publish a business event.
   *
   * If an outbox store is configured (recommended for all financial events),
   * the event is written to the outbox and this method returns immediately —
   * the outbox poller delivers it asynchronously with at-least-once guarantees.
   *
   * Without an outbox, the event is published directly to EventBridge.
   */
  async publish<T extends Record<string, unknown>>(
    event: BusinessEvent<T>,
  ): Promise<PublishResult> {
    if (this.config.outbox) {
      await this.config.outbox.enqueue({
        id: event.messageId,
        eventType: event.eventType,
        tenantId: event.tenantId,
        payload: event as unknown as Record<string, unknown>,
      });
      return { success: true, messageId: event.messageId, queued: true };
    }

    return this.publishDirect(event);
  }

  /** Publish directly to EventBridge — used by the outbox poller. */
  async publishDirect<T extends Record<string, unknown>>(
    event: BusinessEvent<T>,
  ): Promise<PublishResult> {
    const entry: PutEventsRequestEntry = {
      EventBusName: this.config.eventBusName,
      Source: `zopkit.${event.sourceSystem}`,
      DetailType: event.eventType,
      Detail: JSON.stringify(event),
      Time: new Date(event.timestamp),
    };

    try {
      const result = await this.client.send(new PutEventsCommand({ Entries: [entry] }));
      const failed = result.FailedEntryCount ?? 0;
      if (failed > 0) {
        const err = new Error(
          `EventBridge rejected event: ${result.Entries?.[0]?.ErrorMessage ?? 'unknown'}`,
        );
        return { success: false, error: err };
      }
      return { success: true, messageId: result.Entries?.[0]?.EventId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Publish a batch of events (max 10 per EventBridge PutEvents call).
   * Returns per-event results in the same order as the input.
   */
  async publishBatch<T extends Record<string, unknown>>(
    events: BusinessEvent<T>[],
  ): Promise<PublishResult[]> {
    if (events.length === 0) return [];

    const chunks = chunkArray(events, 10);
    const results: PublishResult[] = [];

    for (const chunk of chunks) {
      const entries = chunk.map((ev): PutEventsRequestEntry => ({
        EventBusName: this.config.eventBusName,
        Source: `zopkit.${ev.sourceSystem}`,
        DetailType: ev.eventType,
        Detail: JSON.stringify(ev),
        Time: new Date(ev.timestamp),
      }));

      try {
        const response = await this.client.send(new PutEventsCommand({ Entries: entries }));
        const evbEntries = response.Entries ?? [];
        for (let i = 0; i < chunk.length; i++) {
          const entry = evbEntries[i];
          if (entry?.EventId) {
            results.push({ success: true, messageId: entry.EventId });
          } else {
            results.push({
              success: false,
              error: new Error(entry?.ErrorMessage ?? 'EventBridge rejected entry'),
            });
          }
        }
      } catch (err) {
        for (const _ev of chunk) {
          results.push({ success: false, error: err instanceof Error ? err : new Error(String(err)) });
        }
      }
    }

    return results;
  }
}

/** Parse an inbound EventBridge event detail string back into a BusinessEvent. */
export function parseEventBridgeDetail(detail: string): BusinessEvent {
  const parsed: unknown = JSON.parse(detail);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('EventBridge detail is not an object');
  }
  return parsed as BusinessEvent;
}

/** Validate a BusinessEvent's payload against the schema registry. */
export function validateEventPayload(
  event: BusinessEvent,
  schemas: Record<string, z.ZodTypeAny>,
): { valid: boolean; error?: z.ZodError } {
  const schema = schemas[event.eventType];
  if (!schema) return { valid: true }; // unknown types pass through
  const result = schema.safeParse(event.payload);
  return result.success ? { valid: true } : { valid: false, error: result.error };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
