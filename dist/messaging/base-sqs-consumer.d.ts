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
import { SQSClient, type Message } from '@aws-sdk/client-sqs';
/**
 * Canonical "permanent failure" sentinel.
 *
 * Both CRM and FA had their own local definition with identical shape; this is
 * the SDK-owned canonical one. The host apps re-export it from their existing
 * paths so call-sites that `import { PermanentEventError } from ...local...`
 * keep compiling.
 */
export declare class PermanentEventError extends Error {
    readonly payload?: unknown;
    constructor(message: string, payload?: unknown);
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
    /**
     * Parse a raw SQS body into a `ParsedEvent`. Throw `PermanentEventError`
     * (or any error caught by `isPermanentError`) for unparseable payloads.
     * Return `null` to silently ack & skip (e.g. malformed message that the
     * host has already logged).
     */
    parseMessage: (rawBody: string, msg: Message) => Promise<ParsedEvent<TRaw> | null> | ParsedEvent<TRaw> | null;
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
    writeHeartbeat: (consumerName: string, event: ParsedEvent<TRaw>) => Promise<void>;
    /** Logger — pino, winston, or any structured logger with .info/.warn/.error. */
    logger: BaseConsumerLogger;
    /**
     * Fired when a permanent error is detected. Use for Sentry capture,
     * structured ERROR logs with full payload, alerting, etc.
     */
    onPermanentError?: (event: ParsedEvent<TRaw> | null, err: unknown, rawBody: string) => Promise<void> | void;
    /**
     * Fired when a transient error escapes the handler. Use for Sentry
     * `captureException` etc. Backoff/DLQ is handled by the base class.
     */
    onTransientError?: (event: ParsedEvent<TRaw>, err: unknown) => Promise<void> | void;
    /**
     * Wrap the handler call. Used by FA to inject the DB circuit breaker.
     * CRM passes a pass-through identity.
     */
    runHandler?: (event: ParsedEvent<TRaw>, runner: () => Promise<HandlerResult>) => Promise<HandlerResult>;
    /**
     * Fired after each successful event ack with the duration in ms. Use for
     * app-specific metrics. The base class records no metrics itself.
     */
    onEventProcessed?: (event: ParsedEvent<TRaw>, result: HandlerResult, durationMs: number) => void;
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
export declare class BaseSQSConsumer<TRaw = unknown> {
    private readonly config;
    private running;
    private shuttingDown;
    private readonly maxAttempts;
    private readonly backoff;
    private readonly visibilityTimeoutSeconds;
    private readonly maxMessages;
    private readonly waitTimeSeconds;
    private readonly handlerTimeoutMs;
    private readonly pollErrorRetryMs;
    private inflight;
    private pollPromises;
    constructor(config: BaseSQSConsumerConfig<TRaw>);
    /** Spawn `concurrency` long-poll loops. Idempotent. */
    start(): Promise<void>;
    /**
     * Signal stop and wait for all poll loops to exit (which waits for any
     * in-flight `handleMessage` calls to complete). Safe to await in tests
     * and in graceful-shutdown handlers.
     */
    stop(): Promise<void>;
    /** True while any poll loop or message handler is active. Exposed for tests/health. */
    get isRunning(): boolean;
    /** In-flight message count. Exposed for tests/health. */
    get inflightCount(): number;
    private poll;
    private handleMessage;
    private handleMessageInner;
    /**
     * Exponential backoff via ChangeMessageVisibility until `maxAttempts` is
     * reached, after which the base class stops touching visibility and lets
     * SQS native redrive policy fire (which delivers the message to the DLQ
     * once `maxReceiveCount` is exhausted at the queue level).
     */
    private applyBackoff;
    private startVisibilityExtension;
    private ack;
    private changeVisibility;
}
//# sourceMappingURL=base-sqs-consumer.d.ts.map