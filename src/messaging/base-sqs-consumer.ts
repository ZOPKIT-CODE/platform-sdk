/**
 * BaseSQSConsumer
 *
 * Shared SQS poll/dispatch/visibility orchestration extracted from b2b-crm
 * (`sqs-consumer.ts`) and finance-accounting (`sqs-consumer-service.ts`),
 * which previously implemented the same ~500-line poll loop independently.
 *
 * Contract: the base class owns the long-poll loop, per-message orchestration,
 * visibility extension, exponential backoff, and DLQ trigger semantics. Every
 * app-specific concern (envelope parsing, idempotency tracking, heartbeat
 * writes, handler dispatch, permanent-error detection, logging) is injected
 * via hooks on `BaseSQSConsumerConfig` so each host app preserves its existing
 * external contract — same heartbeat name, same idempotency table layout,
 * same DLQ trigger, same env var defaults, same log strings.
 *
 * Default behaviour (overridable via config):
 *   - Long-poll: 20s wait, up to 10 messages per ReceiveMessageCommand
 *   - Visibility timeout: 60s, extended every (timeout/2) seconds while a
 *     handler is in-flight (floor 10s).
 *   - Backoff: 30s × attempt, capped at 300s
 *   - DLQ trigger: at attempt ≥ maxAttempts (default 3), stop changing
 *     visibility and let SQS native redrive policy fire.
 *
 * Permanent errors (detected via host's `isPermanentError` or a
 * `PermanentEventError` thrown anywhere in the parse/dispatch chain) are
 * ack'd immediately to prevent DLQ spam from unactionable payloads.
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  MessageSystemAttributeName,
  type Message,
} from '@aws-sdk/client-sqs';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Canonical "permanent failure" sentinel.
 *
 * Both CRM and FA had their own local definition with identical shape; this is
 * the SDK-owned canonical one. The host apps re-export it from their existing
 * paths so call-sites that `import { PermanentEventError } from ...local...`
 * keep compiling.
 */
export class PermanentEventError extends Error {
  public readonly payload?: unknown;
  constructor(message: string, payload?: unknown) {
    super(message);
    this.name = 'PermanentEventError';
    this.payload = payload;
  }
}

/**
 * Normalised event shape consumed by the base class. `parseMessage` returns
 * this — the rest of the contract (idempotency, dispatch, heartbeat) keys off
 * `eventId` and `eventType`.
 *
 * Hosts may return their own envelope as `raw` for the dispatch hook.
 */
export interface ParsedEvent<TRaw = unknown> {
  eventId: string;
  eventType: string;
  tenantId: string;
  sqsMessageId: string;
  receiveCount: number;
  receiptHandle: string;
  /** Raw event handed to `dispatchHandler` and `onPermanentError`. */
  raw: TRaw;
}

/**
 * Result returned by the host's `dispatchHandler`. Mirrors the CRM and FA
 * HandlerResult contracts: success/skipped acks the message; success=false
 * triggers backoff.
 */
export interface HandlerResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  /** Optional — preserved for FA back-compat; not used by the base class. */
  acknowledged?: boolean;
  /** Optional — present on FA's HandlerResult; not used by the base class. */
  reason?: string;
}

/**
 * Idempotency state returned by `checkIdempotent`.
 *   'new'         — never seen, proceed
 *   'processing'  — another consumer is currently handling it, ack & skip
 *   'processed'   — already done, ack & skip
 *   'retry'       — previously failed, OK to re-run
 */
export type IdempotencyState = 'new' | 'processing' | 'processed' | 'retry';

/** Minimal structured logger contract. Both pino and winston satisfy this. */
export interface BaseConsumerLogger {
  info: (...a: unknown[]) => void;
  warn: (...a: unknown[]) => void;
  error: (...a: unknown[]) => void;
  debug?: (...a: unknown[]) => void;
}

export interface BaseSQSConsumerConfig<TRaw = unknown> {
  // ── Identity / wiring (required) ────────────────────────────────────────
  /** SQS queue URL to long-poll. */
  queueUrl: string;
  /** Pre-configured SQSClient (region/credentials already set by the host). */
  sqsClient: SQSClient;
  /**
   * Heartbeat row name. NOT unified across apps — CRM stays 'sqs-inbound',
   * FA stays 'sqs-accounting'. Used only by `writeHeartbeat` (the base class
   * passes it back as the first argument).
   */
  consumerName: string;

  // ── Polling tunables ────────────────────────────────────────────────────
  /** Number of parallel poll loops. Default 1. */
  concurrency?: number;
  /** MaxNumberOfMessages per ReceiveMessageCommand. Default 10. */
  maxMessages?: number;
  /** WaitTimeSeconds (long-poll). Default 20. */
  waitTimeSeconds?: number;
  /**
   * Visibility timeout (seconds). Default 60.
   *
   * If `setVisibilityOnReceive` is true (CRM behaviour), this value is also
   * passed as `VisibilityTimeout` on the ReceiveMessageCommand. FA leaves it
   * unset on receive (queue default applies) but still uses this value for
   * the in-flight extension.
   */
  visibilityTimeoutSeconds?: number;
  /**
   * Pass `VisibilityTimeout` on ReceiveMessageCommand. CRM does this; FA does
   * not (it leaves the queue default). Default false.
   */
  setVisibilityOnReceive?: boolean;

  // ── App hooks (required) ────────────────────────────────────────────────
  /**
   * Parse a raw SQS body into a `ParsedEvent`. Throw `PermanentEventError`
   * (or any error caught by `isPermanentError`) for unparseable payloads.
   * Return `null` to silently ack & skip (e.g. malformed message that the
   * host has already logged).
   */
  parseMessage: (
    rawBody: string,
    msg: Message,
  ) => Promise<ParsedEvent<TRaw> | null> | ParsedEvent<TRaw> | null;

  /** Dispatch the parsed event to the host's handler registry. */
  dispatchHandler: (event: ParsedEvent<TRaw>) => Promise<HandlerResult>;

  /** Classify an error as permanent (ack & skip) vs transient (retry). */
  isPermanentError: (err: unknown) => boolean;

  /**
   * Idempotency: has this event already been processed?
   *
   * Return 'new' or 'retry' to proceed; 'processing' or 'processed' to
   * ack & skip.
   */
  checkIdempotent: (event: ParsedEvent<TRaw>) => Promise<IdempotencyState>;

  /** Mark the event as in-flight before handler dispatch. */
  markProcessing: (event: ParsedEvent<TRaw>) => Promise<void>;

  /** Mark the event as completed (after success or skipped). */
  markProcessed: (event: ParsedEvent<TRaw>) => Promise<void>;

  /** Mark the event as failed (transient or permanent — host decides). */
  markFailed: (event: ParsedEvent<TRaw>, reason: string) => Promise<void>;

  /** Best-effort liveness signal — called after each successfully acked event. */
  writeHeartbeat: (
    consumerName: string,
    event: ParsedEvent<TRaw>,
  ) => Promise<void>;

  /** Logger — pino, winston, or any structured logger with .info/.warn/.error. */
  logger: BaseConsumerLogger;

  // ── Optional hooks ──────────────────────────────────────────────────────
  /**
   * Fired when a permanent error is detected. Use for Sentry capture,
   * structured ERROR logs with full payload, alerting, etc.
   */
  onPermanentError?: (
    event: ParsedEvent<TRaw> | null,
    err: unknown,
    rawBody: string,
  ) => Promise<void> | void;

  /**
   * Fired when a transient error escapes the handler. Use for Sentry
   * `captureException` etc. Backoff/DLQ is handled by the base class.
   */
  onTransientError?: (
    event: ParsedEvent<TRaw>,
    err: unknown,
  ) => Promise<void> | void;

  /**
   * Wrap the handler call. Used by FA to inject the DB circuit breaker.
   * CRM passes a pass-through identity.
   */
  runHandler?: (
    event: ParsedEvent<TRaw>,
    runner: () => Promise<HandlerResult>,
  ) => Promise<HandlerResult>;

  /**
   * Fired after each successful event ack with the duration in ms. Use for
   * app-specific metrics. The base class records no metrics itself.
   */
  onEventProcessed?: (
    event: ParsedEvent<TRaw>,
    result: HandlerResult,
    durationMs: number,
  ) => void;

  /**
   * Number of receive attempts after which the base class stops changing
   * visibility and lets SQS native redrive trigger DLQ. Default 3 (matches
   * both CRM and FA before this refactor).
   */
  maxAttempts?: number;

  /**
   * Exponential backoff strategy. Default: `min(30 * attempt, 300)` (matches
   * both CRM and FA before this refactor).
   */
  backoffSeconds?: (attempt: number) => number;

  /** Optional handler timeout in ms. Default: process.env.HANDLER_TIMEOUT_MS ?? 30_000. */
  handlerTimeoutMs?: number;

  /**
   * Sleep duration after a poll error before retrying. Default 5000ms.
   * The CRM and FA both retried after 5s.
   */
  pollErrorRetryMs?: number;
}

// ── Implementation ────────────────────────────────────────────────────────────

const DEFAULT_MAX_MESSAGES = 10;
const DEFAULT_WAIT_TIME_SECONDS = 20;
const DEFAULT_VISIBILITY_TIMEOUT = 60;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_POLL_ERROR_RETRY_MS = 5000;

const defaultBackoff = (attempt: number): number =>
  Math.min(30 * attempt, 300);

export class BaseSQSConsumer<TRaw = unknown> {
  private running = false;
  private shuttingDown = false;
  private readonly maxAttempts: number;
  private readonly backoff: (attempt: number) => number;
  private readonly visibilityTimeoutSeconds: number;
  private readonly maxMessages: number;
  private readonly waitTimeSeconds: number;
  private readonly handlerTimeoutMs: number;
  private readonly pollErrorRetryMs: number;
  private inflight = 0;
  private pollPromises: Promise<void>[] = [];

  constructor(private readonly config: BaseSQSConsumerConfig<TRaw>) {
    this.maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.backoff = config.backoffSeconds ?? defaultBackoff;
    this.visibilityTimeoutSeconds =
      config.visibilityTimeoutSeconds ?? DEFAULT_VISIBILITY_TIMEOUT;
    this.maxMessages = config.maxMessages ?? DEFAULT_MAX_MESSAGES;
    this.waitTimeSeconds = config.waitTimeSeconds ?? DEFAULT_WAIT_TIME_SECONDS;
    this.handlerTimeoutMs =
      config.handlerTimeoutMs ?? Number(process.env.HANDLER_TIMEOUT_MS ?? 30_000);
    this.pollErrorRetryMs = config.pollErrorRetryMs ?? DEFAULT_POLL_ERROR_RETRY_MS;
  }

  /** Spawn `concurrency` long-poll loops. Idempotent. */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.shuttingDown = false;
    const concurrency = Math.max(1, this.config.concurrency ?? 1);
    this.pollPromises = [];
    for (let i = 0; i < concurrency; i++) {
      this.pollPromises.push(this.poll());
    }
  }

  /**
   * Signal stop and wait for all poll loops to exit (which waits for any
   * in-flight `handleMessage` calls to complete). Safe to await in tests
   * and in graceful-shutdown handlers.
   */
  async stop(): Promise<void> {
    this.shuttingDown = true;
    this.running = false;
    if (this.pollPromises.length > 0) {
      await Promise.allSettled(this.pollPromises);
      this.pollPromises = [];
    }
  }

  /** True while any poll loop or message handler is active. Exposed for tests/health. */
  get isRunning(): boolean {
    return this.running;
  }

  /** In-flight message count. Exposed for tests/health. */
  get inflightCount(): number {
    return this.inflight;
  }

  // ── Poll loop ───────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    const { sqsClient, queueUrl, logger } = this.config;
    while (this.running && !this.shuttingDown) {
      try {
        const cmd = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          WaitTimeSeconds: this.waitTimeSeconds,
          MaxNumberOfMessages: this.maxMessages,
          MessageSystemAttributeNames: [
            MessageSystemAttributeName.ApproximateReceiveCount,
          ],
          ...(this.config.setVisibilityOnReceive
            ? { VisibilityTimeout: this.visibilityTimeoutSeconds }
            : {}),
        });
        const response = await sqsClient.send(cmd);
        const messages = response.Messages ?? [];
        if (messages.length > 0) {
          await Promise.all(messages.map((msg) => this.handleMessage(msg)));
        } else if (this.waitTimeSeconds === 0) {
          // Defensive: when long-polling is disabled (tests, or a misconfig)
          // an empty receive returns instantly. Yield to the event loop so
          // the stop signal can propagate and we don't spin a tight loop.
          await new Promise<void>((r) => setImmediate(r));
        }
      } catch (err: unknown) {
        if (this.shuttingDown) return;
        const reason = err instanceof Error ? err.message : String(err);
        logger.error(
          `[SQS Consumer] Poll error — retrying in ${Math.round(this.pollErrorRetryMs / 1000)}s: ${reason}`,
        );
        await sleep(this.pollErrorRetryMs);
      }
    }
  }

  // ── Per-message orchestration ────────────────────────────────────────────

  private async handleMessage(msg: Message): Promise<void> {
    this.inflight++;
    try {
      await this.handleMessageInner(msg);
    } finally {
      this.inflight--;
    }
  }

  private async handleMessageInner(msg: Message): Promise<void> {
    const {
      parseMessage,
      dispatchHandler,
      isPermanentError,
      checkIdempotent,
      markProcessing,
      markProcessed,
      markFailed,
      writeHeartbeat,
      logger,
      onPermanentError,
      onTransientError,
      onEventProcessed,
      runHandler,
      consumerName,
    } = this.config;

    if (!msg.Body || !msg.ReceiptHandle) return;

    // ── 1. Parse ────────────────────────────────────────────────────────
    let event: ParsedEvent<TRaw> | null = null;
    try {
      event = (await parseMessage(msg.Body, msg)) ?? null;
    } catch (err) {
      // Permanent parse error (bad JSON, schema failure, missing required
      // fields) — ack and let the host's onPermanentError do structured
      // ERROR logging. We do NOT log here ourselves: host logging strings
      // (CRM uses console.error '[SQS Consumer] Permanent error - ...',
      // FA uses logger.error with structured fields) must stay stable for
      // log-parsers/dashboards.
      if (onPermanentError) {
        try {
          await onPermanentError(null, err, msg.Body);
        } catch {
          /* host's logging hook must never break the consumer */
        }
      } else {
        const reason = err instanceof Error ? err.message : String(err);
        logger.error(
          `[SQS Consumer] Unparseable message — deleting to avoid DLQ loop: ${reason}`,
        );
      }
      await this.ack(msg.ReceiptHandle);
      return;
    }

    if (!event) {
      // Host returned null — already logged & wants to silently ack.
      await this.ack(msg.ReceiptHandle);
      return;
    }

    // ── 2. Idempotency check ─────────────────────────────────────────────
    let state: IdempotencyState;
    try {
      state = await checkIdempotent(event);
    } catch (err) {
      // Fail-open: idempotency probe failures should not block forward
      // progress. Both apps explicitly fail open today.
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[SQS Consumer] Idempotency check failed — proceeding fail-open eventId=${event.eventId}: ${reason}`,
      );
      state = 'new';
    }

    if (state === 'processed' || state === 'processing') {
      logger.info(
        `[SQS Consumer] Duplicate — skipping eventId=${event.eventId} type=${event.eventType}`,
      );
      await this.ack(msg.ReceiptHandle);
      return;
    }

    // ── 3. Mark processing ───────────────────────────────────────────────
    await markProcessing(event);

    // ── 4. Extend visibility while handler runs ──────────────────────────
    const extensionTimer = this.startVisibilityExtension(
      msg.ReceiptHandle,
      event.eventId,
    );

    const startedAt = Date.now();
    try {
      // ── 5. Dispatch handler with optional wrapper (e.g. FA circuit breaker) ─
      const baseRunner = (): Promise<HandlerResult> =>
        Promise.race([
          dispatchHandler(event!),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Handler timeout after ${this.handlerTimeoutMs}ms — eventType=${event!.eventType} eventId=${event!.eventId}`,
                  ),
                ),
              this.handlerTimeoutMs,
            ),
          ),
        ]);

      const result = runHandler
        ? await runHandler(event, baseRunner)
        : await baseRunner();

      const durationMs = Date.now() - startedAt;

      if (result.success || result.skipped) {
        await markProcessed(event);
        await writeHeartbeat(consumerName, event).catch((hbErr: unknown) =>
          logger.warn('[SQS Consumer] Heartbeat upsert failed (non-fatal)', {
            error: hbErr instanceof Error ? hbErr.message : String(hbErr),
          }),
        );
        await this.ack(msg.ReceiptHandle);
        if (onEventProcessed) onEventProcessed(event, result, durationMs);
      } else {
        await markFailed(
          event,
          result.error ?? 'handler returned success=false',
        );
        if (onEventProcessed) onEventProcessed(event, result, durationMs);
        await this.applyBackoff(msg, event.eventId);
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);

      if (isPermanentError(err)) {
        // Permanent → ack + host logs/onPermanentError. Failure-mark is
        // best-effort: if the host's mark-failed path itself dies we still
        // ack to keep the queue moving.
        await markFailed(event, `permanent: ${reason}`).catch(() => {});
        if (onPermanentError) {
          try {
            await onPermanentError(event, err, msg.Body);
          } catch {
            /* host's logging hook must never break the consumer */
          }
        } else {
          logger.error(
            `[SQS Consumer] Permanent error — acking to prevent DLQ spam`,
            {
              eventId: event.eventId,
              eventType: event.eventType,
              tenantId: event.tenantId,
              sqsMessageId: event.sqsMessageId,
              error: reason,
            },
          );
        }
        await this.ack(msg.ReceiptHandle);
        return;
      }

      // Transient → backoff. Host's onTransientError can log/capture.
      await markFailed(event, reason).catch(() => {});
      if (onTransientError) {
        try {
          await onTransientError(event, err);
        } catch {
          /* host hook must never break the consumer */
        }
      } else {
        logger.error(
          `[SQS Consumer] Unhandled exception for eventId=${event.eventId}: ${reason}`,
        );
      }
      await this.applyBackoff(msg, event.eventId).catch(() => {});
    } finally {
      clearInterval(extensionTimer);
    }
  }

  // ── Backoff & DLQ trigger ────────────────────────────────────────────────

  /**
   * Exponential backoff via ChangeMessageVisibility until `maxAttempts` is
   * reached, after which the base class stops touching visibility and lets
   * SQS native redrive policy fire (which delivers the message to the DLQ
   * once `maxReceiveCount` is exhausted at the queue level).
   */
  private async applyBackoff(msg: Message, eventId: string): Promise<void> {
    const receiveCount = parseInt(
      msg.Attributes?.ApproximateReceiveCount ?? '1',
      10,
    );

    if (receiveCount >= this.maxAttempts) {
      this.config.logger.error(
        `[SQS Consumer] Max retries reached for eventId=${eventId} — SQS will move to DLQ`,
      );
      return;
    }

    const backoffSec = this.backoff(receiveCount);
    this.config.logger.warn(
      `[SQS Consumer] Retry eventId=${eventId} in ${backoffSec}s (attempt ${receiveCount})`,
    );
    await this.changeVisibility(msg.ReceiptHandle!, backoffSec).catch(() => {});
  }

  // ── Visibility extension during long-running handlers ───────────────────

  private startVisibilityExtension(
    receiptHandle: string,
    eventId: string,
  ): ReturnType<typeof setInterval> {
    const intervalMs = Math.max(
      (this.visibilityTimeoutSeconds / 2) * 1000,
      10_000,
    );
    const timer = setInterval(async () => {
      try {
        await this.changeVisibility(
          receiptHandle,
          this.visibilityTimeoutSeconds,
        );
      } catch {
        // Non-fatal — if extend fails the message may re-deliver; idempotency handles it.
        this.config.logger.debug?.(
          `[SQS Consumer] Visibility extension failed for eventId=${eventId} (non-fatal)`,
        );
      }
    }, intervalMs);
    if (typeof (timer as { unref?: () => void }).unref === 'function') {
      (timer as { unref: () => void }).unref();
    }
    return timer;
  }

  // ── SQS client wrappers ──────────────────────────────────────────────────

  private async ack(receiptHandle: string | undefined): Promise<void> {
    if (!receiptHandle) return;
    try {
      await this.config.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.config.queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );
    } catch (err: unknown) {
      this.config.logger.warn(
        '[SQS Consumer] DeleteMessage failed (message may re-deliver)',
        { error: err instanceof Error ? err.message : String(err) },
      );
    }
  }

  private async changeVisibility(
    receiptHandle: string,
    seconds: number,
  ): Promise<void> {
    await this.config.sqsClient.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: this.config.queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: seconds,
      }),
    );
  }
}

// ── Internal helper ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
