import {
  SNSClient,
  PublishCommand,
  PublishBatchCommand,
  type PublishBatchRequestEntry,
  type MessageAttributeValue,
} from '@aws-sdk/client-sns';
import type { BusinessEvent } from './envelope';
import type { OutboxStore } from '../outbox/types';
import { injectTraceContext, withProducerSpan } from './trace-context';

export interface SnsPublisherConfig {
  /** The business-events SNS topic ARN (e.g. arn:aws:sns:…:business-events). */
  topicArn: string;
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

/**
 * Interface implemented by event publishers. The outbox poller depends on this
 * (not a concrete class) so any transport-specific publisher can be plugged in.
 */
export interface BusinessEventPublisher {
  publishDirect<T extends Record<string, unknown>>(event: BusinessEvent<T>): Promise<PublishResult>;
  publishBatch<T extends Record<string, unknown>>(events: BusinessEvent<T>[]): Promise<PublishResult[]>;
}

/**
 * MessageAttributes carried on every business event:
 *   - eventType / sourceSystem / tenantId → drive SNS subscription FILTER POLICIES
 *     (consumers subscribe to only the events they care about) and the in-app
 *     loop-guard (sourceSystem != self).
 *   - sentry-trace / baggage / traceparent → distributed tracing (injected).
 * Subscriptions use raw message delivery, so the SQS body is the BusinessEvent
 * JSON and these attributes survive to the consumer.
 */
function buildMessageAttributes<T extends Record<string, unknown>>(
  event: BusinessEvent<T>,
): Record<string, MessageAttributeValue> {
  const attrs = {
    eventType: { DataType: 'String', StringValue: event.eventType },
    sourceSystem: { DataType: 'String', StringValue: event.sourceSystem },
    tenantId: { DataType: 'String', StringValue: event.tenantId },
  };
  injectTraceContext(attrs);
  return attrs as Record<string, MessageAttributeValue>;
}

/**
 * Publishes business events to the `business-events` SNS topic (replaces the
 * former EventBridge bus). Mirrors the previous publisher's API so callers and
 * the outbox poller are unchanged apart from the config shape.
 */
export class SnsPublisher implements BusinessEventPublisher {
  private readonly client: SNSClient;

  constructor(private readonly config: SnsPublisherConfig) {
    this.client = new SNSClient({ region: config.region ?? process.env.AWS_REGION });
  }

  /**
   * Publish a business event. With an outbox configured (recommended for all
   * financial events) the event is written to the outbox and delivered
   * asynchronously by the poller; otherwise it is published inline.
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

  /** Publish directly to SNS — used inline and by the outbox poller. */
  async publishDirect<T extends Record<string, unknown>>(
    event: BusinessEvent<T>,
  ): Promise<PublishResult> {
    try {
      // Wrap in a producer span so buildMessageAttributes (which injects the
      // trace context) runs with a valid active span — even from background
      // contexts. Otherwise the consumer would start a fresh root trace.
      const result = await withProducerSpan(
        `publish ${event.eventType}`,
        {
          'messaging.system': 'aws_sns',
          'messaging.operation.name': 'publish',
          'messaging.destination.name': 'business-events',
          'messaging.message.id': event.messageId,
          'event.type': event.eventType,
          'event.source_system': event.sourceSystem,
        },
        () =>
          this.client.send(
            new PublishCommand({
              TopicArn: this.config.topicArn,
              Message: JSON.stringify(event),
              MessageAttributes: buildMessageAttributes(event),
            }),
          ),
      );
      return { success: true, messageId: result.MessageId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Publish a batch of events (max 10 per SNS PublishBatch call). Returns
   * per-event results in the same order as the input.
   */
  async publishBatch<T extends Record<string, unknown>>(
    events: BusinessEvent<T>[],
  ): Promise<PublishResult[]> {
    if (events.length === 0) return [];

    const chunks = chunkArray(events, 10);
    const results: PublishResult[] = [];

    for (const chunk of chunks) {
      try {
        // Build entries + send inside one producer span so buildMessageAttributes
        // (trace injection) runs with a valid active span. Events in a chunk share
        // this span's trace — the batch API carries no per-event origin context, so
        // a single span per chunk is the correct granularity.
        const response = await withProducerSpan(
          `publish batch (${chunk.length})`,
          {
            'messaging.system': 'aws_sns',
            'messaging.operation.name': 'publish',
            'messaging.destination.name': 'business-events',
            'messaging.batch.message_count': chunk.length,
          },
          () => {
            const entries: PublishBatchRequestEntry[] = chunk.map((ev, i) => ({
              Id: String(i),
              Message: JSON.stringify(ev),
              MessageAttributes: buildMessageAttributes(ev),
            }));
            return this.client.send(
              new PublishBatchCommand({ TopicArn: this.config.topicArn, PublishBatchRequestEntries: entries }),
            );
          },
        );
        const ok = new Map((response.Successful ?? []).map((s) => [s.Id, s.MessageId]));
        const failedIds = new Set((response.Failed ?? []).map((f) => f.Id));
        const failedMsg = new Map((response.Failed ?? []).map((f) => [f.Id, f.Message ?? 'SNS rejected entry']));
        for (let i = 0; i < chunk.length; i++) {
          const id = String(i);
          if (failedIds.has(id)) {
            results.push({ success: false, error: new Error(failedMsg.get(id)) });
          } else {
            results.push({ success: true, messageId: ok.get(id) });
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

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
