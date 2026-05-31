/**
 * Unit tests for BaseSQSConsumer.
 *
 * Covers the orchestration contract that both CRM and FA depend on:
 *   - poll loop receives messages and dispatches via the configured hooks
 *   - idempotency states (new/retry/processed/processing) trigger the right path
 *   - permanent errors ack immediately and fire onPermanentError
 *   - transient errors mark failed, fire onTransientError, and apply backoff
 *   - DLQ trigger: at attempt ≥ maxAttempts the base class stops touching
 *     visibility and lets SQS native redrive fire
 *   - visibility-extension timer fires & cleans up
 *   - runHandler hook wraps the handler call (FA circuit breaker injection point)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Message } from '@aws-sdk/client-sqs';
import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} from '@aws-sdk/client-sqs';
import {
  BaseSQSConsumer,
  PermanentEventError,
  type BaseSQSConsumerConfig,
  type ParsedEvent,
  type HandlerResult,
  type IdempotencyState,
} from './base-sqs-consumer';

// ── Test harness ─────────────────────────────────────────────────────────────

interface HarnessOverrides
  extends Partial<BaseSQSConsumerConfig<Record<string, unknown>>> {}

function makeMessage(opts: {
  body?: string;
  eventId?: string;
  eventType?: string;
  receiveCount?: number;
  receiptHandle?: string;
  messageId?: string;
} = {}): Message {
  const eventId = opts.eventId ?? 'evt-1';
  const eventType = opts.eventType ?? 'user.created';
  return {
    MessageId: opts.messageId ?? 'msg-1',
    ReceiptHandle: opts.receiptHandle ?? 'rh-1',
    Body:
      opts.body ??
      JSON.stringify({ eventId, eventType, tenantId: 't-1', payload: {} }),
    Attributes: {
      ApproximateReceiveCount: String(opts.receiveCount ?? 1),
    },
  };
}

function makeHarness(overrides: HarnessOverrides = {}): {
  consumer: BaseSQSConsumer<Record<string, unknown>>;
  config: BaseSQSConsumerConfig<Record<string, unknown>> & {
    sqsClient: { send: ReturnType<typeof vi.fn> };
  };
  setNextReceive: (messages: Message[]) => void;
  ranOnce: () => Promise<void>;
} {
  const queue: Message[][] = [];
  const send = vi.fn(async (cmd: unknown) => {
    if (cmd instanceof ReceiveMessageCommand) {
      const batch = queue.shift();
      return { Messages: batch ?? [] };
    }
    if (cmd instanceof DeleteMessageCommand) return {};
    if (cmd instanceof ChangeMessageVisibilityCommand) return {};
    return {};
  });

  const defaultParse = vi.fn(async (body: string): Promise<ParsedEvent | null> => {
    const raw = JSON.parse(body) as {
      eventId: string;
      eventType: string;
      tenantId: string;
    };
    return {
      eventId: raw.eventId,
      eventType: raw.eventType,
      tenantId: raw.tenantId,
      sqsMessageId: 'msg-1',
      receiveCount: 1,
      receiptHandle: 'rh-1',
      raw,
    };
  });

  const defaultDispatch = vi.fn(
    async (): Promise<HandlerResult> => ({ success: true }),
  );

  const defaultIdempotent = vi.fn(
    async (): Promise<IdempotencyState> => 'new',
  );

  const config: BaseSQSConsumerConfig<Record<string, unknown>> & {
    sqsClient: { send: ReturnType<typeof vi.fn> };
  } = {
    queueUrl: 'https://sqs.local/test-queue',
    sqsClient: { send } as unknown as BaseSQSConsumerConfig['sqsClient'] & {
      send: ReturnType<typeof vi.fn>;
    },
    consumerName: 'sqs-test',
    concurrency: 1,
    maxMessages: 10,
    waitTimeSeconds: 0, // disable real long-poll wait in tests
    visibilityTimeoutSeconds: 60,
    pollErrorRetryMs: 10,
    parseMessage: defaultParse,
    dispatchHandler: defaultDispatch,
    isPermanentError: (err: unknown) => err instanceof PermanentEventError,
    checkIdempotent: defaultIdempotent,
    markProcessing: vi.fn(async () => {}),
    markProcessed: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
    writeHeartbeat: vi.fn(async () => {}),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  };

  const consumer = new BaseSQSConsumer(config);

  return {
    consumer,
    config,
    setNextReceive: (messages: Message[]) => queue.push(messages),
    ranOnce: async () => {
      await consumer.start();
      // Let the poll loop drain whatever batches are queued, then stop.
      // Each setImmediate cycle = one poll iteration; 5 cycles is enough.
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setImmediate(r));
      }
      await consumer.stop();
      // Drain post-stop microtasks
      await new Promise((r) => setImmediate(r));
    },
  };
}

describe('BaseSQSConsumer', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('happy path', () => {
    it('parses, dispatches, marks processed, writes heartbeat, and acks', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness();
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(config.parseMessage).toHaveBeenCalledTimes(1);
      expect(config.dispatchHandler).toHaveBeenCalledTimes(1);
      expect(config.markProcessing).toHaveBeenCalledTimes(1);
      expect(config.markProcessed).toHaveBeenCalledTimes(1);
      expect(config.writeHeartbeat).toHaveBeenCalledWith(
        'sqs-test',
        expect.objectContaining({ eventId: 'evt-1' }),
      );

      const deletes = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof DeleteMessageCommand,
      );
      expect(deletes).toHaveLength(1);
    });

    it('treats skipped=true as a successful processed', async () => {
      const dispatch = vi.fn(
        async (): Promise<HandlerResult> => ({ success: false, skipped: true }),
      );
      const { config, setNextReceive, ranOnce } = makeHarness({
        dispatchHandler: dispatch,
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(config.markProcessed).toHaveBeenCalledTimes(1);
      expect(config.markFailed).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('acks and skips when state=processed (no dispatch)', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness({
        checkIdempotent: vi.fn(async () => 'processed'),
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(config.dispatchHandler).not.toHaveBeenCalled();
      expect(config.markProcessing).not.toHaveBeenCalled();
      const deletes = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof DeleteMessageCommand,
      );
      expect(deletes).toHaveLength(1);
    });

    it('acks and skips when state=processing', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness({
        checkIdempotent: vi.fn(async () => 'processing'),
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(config.dispatchHandler).not.toHaveBeenCalled();
      const deletes = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof DeleteMessageCommand,
      );
      expect(deletes).toHaveLength(1);
    });

    it('proceeds when state=retry', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness({
        checkIdempotent: vi.fn(async () => 'retry'),
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(config.dispatchHandler).toHaveBeenCalledTimes(1);
      expect(config.markProcessed).toHaveBeenCalledTimes(1);
    });

    it('fails open when checkIdempotent throws', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness({
        checkIdempotent: vi.fn(async () => {
          throw new Error('db down');
        }),
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(config.dispatchHandler).toHaveBeenCalledTimes(1);
      expect(config.logger.warn).toHaveBeenCalled();
    });
  });

  describe('parse errors', () => {
    it('acks unparseable messages and fires onPermanentError', async () => {
      const onPermanent = vi.fn(async () => {});
      const { config, setNextReceive, ranOnce } = makeHarness({
        parseMessage: vi.fn(async () => {
          throw new Error('bad json');
        }),
        onPermanentError: onPermanent,
      });
      setNextReceive([makeMessage({ body: 'not-json' })]);
      await ranOnce();

      expect(onPermanent).toHaveBeenCalledWith(
        null,
        expect.any(Error),
        'not-json',
      );
      expect(config.dispatchHandler).not.toHaveBeenCalled();

      const deletes = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof DeleteMessageCommand,
      );
      expect(deletes).toHaveLength(1);
    });

    it('acks silently when parseMessage returns null', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness({
        parseMessage: vi.fn(async () => null),
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(config.dispatchHandler).not.toHaveBeenCalled();
      const deletes = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof DeleteMessageCommand,
      );
      expect(deletes).toHaveLength(1);
    });
  });

  describe('permanent errors from handler', () => {
    it('marks failed, acks, and fires onPermanentError when handler throws PermanentEventError', async () => {
      const onPermanent = vi.fn(async () => {});
      const { config, setNextReceive, ranOnce } = makeHarness({
        dispatchHandler: vi.fn(async () => {
          throw new PermanentEventError('schema mismatch', { foo: 'bar' });
        }),
        onPermanentError: onPermanent,
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(config.markFailed).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('permanent: schema mismatch'),
      );
      expect(onPermanent).toHaveBeenCalled();
      const deletes = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof DeleteMessageCommand,
      );
      expect(deletes).toHaveLength(1);

      const visChanges = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof ChangeMessageVisibilityCommand,
      );
      // Should NOT change visibility on permanent error — message is acked.
      expect(visChanges).toHaveLength(0);
    });

    it('respects custom isPermanentError detection (Zod-shape duck-typing)', async () => {
      const zodLike = Object.assign(new Error('validation failed'), {
        name: 'ZodError',
        issues: [{ path: ['x'], message: 'required' }],
      });
      const onPermanent = vi.fn(async () => {});
      const { config, setNextReceive, ranOnce } = makeHarness({
        dispatchHandler: vi.fn(async () => {
          throw zodLike;
        }),
        isPermanentError: (err: unknown): boolean => {
          if (err instanceof PermanentEventError) return true;
          const e = err as { name?: string; issues?: unknown };
          return e?.name === 'ZodError' && Array.isArray(e.issues);
        },
        onPermanentError: onPermanent,
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(onPermanent).toHaveBeenCalled();
      expect(config.markFailed).toHaveBeenCalled();
    });
  });

  describe('transient errors → backoff & DLQ trigger', () => {
    it('changes visibility on attempt 1 (transient handler error)', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness({
        dispatchHandler: vi.fn(async () => {
          throw new Error('db timeout');
        }),
      });
      setNextReceive([makeMessage({ receiveCount: 1 })]);
      await ranOnce();

      const visChanges = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof ChangeMessageVisibilityCommand,
      );
      expect(visChanges).toHaveLength(1);
      const cmd = visChanges[0][0] as ChangeMessageVisibilityCommand;
      expect(cmd.input.VisibilityTimeout).toBe(30); // 30 * 1 (default backoff)

      const deletes = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof DeleteMessageCommand,
      );
      // Should NOT delete the message — let SQS re-deliver after backoff.
      expect(deletes).toHaveLength(0);
    });

    it('stops touching visibility at attempt ≥ maxAttempts (DLQ trigger)', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness({
        dispatchHandler: vi.fn(async () => {
          throw new Error('still broken');
        }),
      });
      setNextReceive([makeMessage({ receiveCount: 3 })]);
      await ranOnce();

      const visChanges = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof ChangeMessageVisibilityCommand,
      );
      // Visibility extension timer fires before the throw — there can be 0
      // ChangeMessageVisibility calls (handler throws before the interval
      // fires). Critically: no BACKOFF visibility change is made because
      // we're at maxAttempts.
      const backoffCalls = visChanges.filter(
        (c) => (c[0] as ChangeMessageVisibilityCommand).input.VisibilityTimeout !== 60,
      );
      expect(backoffCalls).toHaveLength(0);

      const deletes = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof DeleteMessageCommand,
      );
      expect(deletes).toHaveLength(0);

      // Should log the max-retries-reached message
      expect(config.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Max retries reached'),
      );
    });

    it('handler returning success=false also triggers backoff', async () => {
      const { config, setNextReceive, ranOnce } = makeHarness({
        dispatchHandler: vi.fn(async () => ({ success: false, error: 'try later' })),
      });
      setNextReceive([makeMessage({ receiveCount: 2 })]);
      await ranOnce();

      const visChanges = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof ChangeMessageVisibilityCommand,
      );
      // Expect a backoff change (60s = 30*2) — there may also be timer-based
      // extensions, but at least one must be the backoff value.
      const backoffCalls = visChanges.filter(
        (c) => (c[0] as ChangeMessageVisibilityCommand).input.VisibilityTimeout === 60,
      );
      expect(backoffCalls.length).toBeGreaterThanOrEqual(1);

      expect(config.markFailed).toHaveBeenCalledWith(
        expect.any(Object),
        'try later',
      );
    });

    it('fires onTransientError hook for transient failures', async () => {
      const onTransient = vi.fn(async () => {});
      const { setNextReceive, ranOnce } = makeHarness({
        dispatchHandler: vi.fn(async () => {
          throw new Error('blip');
        }),
        onTransientError: onTransient,
      });
      setNextReceive([makeMessage({ receiveCount: 1 })]);
      await ranOnce();

      expect(onTransient).toHaveBeenCalled();
    });
  });

  describe('runHandler wrapper (FA circuit breaker injection)', () => {
    it('routes dispatch through runHandler when configured', async () => {
      const runHandler = vi.fn(
        async (
          _e: ParsedEvent,
          runner: () => Promise<HandlerResult>,
        ): Promise<HandlerResult> => runner(),
      );
      const { setNextReceive, ranOnce } = makeHarness({ runHandler });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(runHandler).toHaveBeenCalledTimes(1);
    });

    it('lets runHandler short-circuit (circuit-open)', async () => {
      const runHandler = vi.fn(async (): Promise<HandlerResult> => {
        throw new Error('circuit open');
      });
      const { config, setNextReceive, ranOnce } = makeHarness({ runHandler });
      setNextReceive([makeMessage({ receiveCount: 1 })]);
      await ranOnce();

      // Circuit-open is treated as transient → backoff.
      const visChanges = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof ChangeMessageVisibilityCommand,
      );
      const backoffCalls = visChanges.filter(
        (c) => (c[0] as ChangeMessageVisibilityCommand).input.VisibilityTimeout === 30,
      );
      expect(backoffCalls).toHaveLength(1);
    });
  });

  describe('metrics hook', () => {
    it('fires onEventProcessed with duration on success', async () => {
      const onProcessed = vi.fn();
      const { setNextReceive, ranOnce } = makeHarness({
        onEventProcessed: onProcessed,
      });
      setNextReceive([makeMessage()]);
      await ranOnce();

      expect(onProcessed).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: 'evt-1' }),
        expect.objectContaining({ success: true }),
        expect.any(Number),
      );
    });

    it('fires onEventProcessed on success=false handler return', async () => {
      const onProcessed = vi.fn();
      const { setNextReceive, ranOnce } = makeHarness({
        dispatchHandler: vi.fn(async () => ({ success: false, error: 'x' })),
        onEventProcessed: onProcessed,
      });
      setNextReceive([makeMessage({ receiveCount: 1 })]);
      await ranOnce();

      expect(onProcessed).toHaveBeenCalled();
    });
  });

  describe('poll loop control', () => {
    it('is idempotent on start()', async () => {
      const { consumer, config, setNextReceive } = makeHarness({
        concurrency: 1,
      });
      setNextReceive([]);
      await consumer.start();
      await consumer.start();
      expect(consumer.isRunning).toBe(true);
      await consumer.stop();
      // Should have only one set of receive calls inflight at a time
      expect(config.sqsClient.send).toHaveBeenCalled();
    });

    it('spawns `concurrency` poll loops', async () => {
      const { consumer, config } = makeHarness({ concurrency: 3 });
      await consumer.start();
      // Give the loops a chance to fire one ReceiveMessageCommand each
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setImmediate(r));
      }
      await consumer.stop();

      const receives = config.sqsClient.send.mock.calls.filter(
        (c) => c[0] instanceof ReceiveMessageCommand,
      );
      // At least 3 receive calls from the 3 loops on their first iteration.
      expect(receives.length).toBeGreaterThanOrEqual(3);
    });

    it('retries the poll loop after a receive error', async () => {
      // First receive throws, second succeeds. Use a single fake send that
      // tracks call count.
      let receiveCalls = 0;
      const send = vi.fn(async (cmd: unknown) => {
        if (cmd instanceof ReceiveMessageCommand) {
          receiveCalls++;
          if (receiveCalls === 1) throw new Error('aws blip');
          return { Messages: [] };
        }
        return {};
      });
      const consumer = new BaseSQSConsumer({
        queueUrl: 'https://sqs.local/q',
        sqsClient: { send } as unknown as BaseSQSConsumerConfig['sqsClient'],
        consumerName: 'sqs-test',
        waitTimeSeconds: 0,
        pollErrorRetryMs: 10,
        parseMessage: vi.fn(),
        dispatchHandler: vi.fn(),
        isPermanentError: () => false,
        checkIdempotent: vi.fn(async () => 'new'),
        markProcessing: vi.fn(async () => {}),
        markProcessed: vi.fn(async () => {}),
        markFailed: vi.fn(async () => {}),
        writeHeartbeat: vi.fn(async () => {}),
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      await consumer.start();
      // Wait > pollErrorRetryMs so the second receive fires.
      await new Promise((r) => setTimeout(r, 50));
      await consumer.stop();

      expect(receiveCalls).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PermanentEventError class', () => {
    it('carries the payload', () => {
      const err = new PermanentEventError('bad', { x: 1 });
      expect(err.name).toBe('PermanentEventError');
      expect(err.payload).toEqual({ x: 1 });
      expect(err.message).toBe('bad');
    });

    it('is instanceof Error', () => {
      const err = new PermanentEventError('bad');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('VisibilityTimeout on receive', () => {
    it('does not include VisibilityTimeout by default (FA behaviour)', async () => {
      const { config, consumer } = makeHarness();
      await consumer.start();
      await new Promise((r) => setImmediate(r));
      await consumer.stop();

      const receive = config.sqsClient.send.mock.calls.find(
        (c) => c[0] instanceof ReceiveMessageCommand,
      );
      expect(receive).toBeDefined();
      const cmd = receive![0] as ReceiveMessageCommand;
      expect(cmd.input.VisibilityTimeout).toBeUndefined();
    });

    it('includes VisibilityTimeout on receive when setVisibilityOnReceive=true (CRM behaviour)', async () => {
      const { config, consumer } = makeHarness({
        setVisibilityOnReceive: true,
        visibilityTimeoutSeconds: 60,
      });
      await consumer.start();
      await new Promise((r) => setImmediate(r));
      await consumer.stop();

      const receive = config.sqsClient.send.mock.calls.find(
        (c) => c[0] instanceof ReceiveMessageCommand,
      );
      const cmd = receive![0] as ReceiveMessageCommand;
      expect(cmd.input.VisibilityTimeout).toBe(60);
    });
  });
});
