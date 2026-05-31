"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSQSConsumer = exports.PermanentEventError = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
// ── Public types ──────────────────────────────────────────────────────────────
/**
 * Canonical "permanent failure" sentinel.
 *
 * Both CRM and FA had their own local definition with identical shape; this is
 * the SDK-owned canonical one. The host apps re-export it from their existing
 * paths so call-sites that `import { PermanentEventError } from ...local...`
 * keep compiling.
 */
class PermanentEventError extends Error {
    constructor(message, payload) {
        super(message);
        this.name = 'PermanentEventError';
        this.payload = payload;
    }
}
exports.PermanentEventError = PermanentEventError;
// ── Implementation ────────────────────────────────────────────────────────────
const DEFAULT_MAX_MESSAGES = 10;
const DEFAULT_WAIT_TIME_SECONDS = 20;
const DEFAULT_VISIBILITY_TIMEOUT = 60;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_POLL_ERROR_RETRY_MS = 5000;
const defaultBackoff = (attempt) => Math.min(30 * attempt, 300);
class BaseSQSConsumer {
    constructor(config) {
        this.config = config;
        this.running = false;
        this.shuttingDown = false;
        this.inflight = 0;
        this.pollPromises = [];
        this.maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
        this.backoff = config.backoffSeconds ?? defaultBackoff;
        this.visibilityTimeoutSeconds =
            config.visibilityTimeoutSeconds ?? DEFAULT_VISIBILITY_TIMEOUT;
        this.maxMessages = config.maxMessages ?? DEFAULT_MAX_MESSAGES;
        this.waitTimeSeconds = config.waitTimeSeconds ?? DEFAULT_WAIT_TIME_SECONDS;
        this.handlerTimeoutMs =
            config.handlerTimeoutMs ?? Number(process.env.HANDLER_TIMEOUT_MS ?? 30000);
        this.pollErrorRetryMs = config.pollErrorRetryMs ?? DEFAULT_POLL_ERROR_RETRY_MS;
    }
    /** Spawn `concurrency` long-poll loops. Idempotent. */
    async start() {
        if (this.running)
            return;
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
    async stop() {
        this.shuttingDown = true;
        this.running = false;
        if (this.pollPromises.length > 0) {
            await Promise.allSettled(this.pollPromises);
            this.pollPromises = [];
        }
    }
    /** True while any poll loop or message handler is active. Exposed for tests/health. */
    get isRunning() {
        return this.running;
    }
    /** In-flight message count. Exposed for tests/health. */
    get inflightCount() {
        return this.inflight;
    }
    // ── Poll loop ───────────────────────────────────────────────────────────
    async poll() {
        const { sqsClient, queueUrl, logger } = this.config;
        while (this.running && !this.shuttingDown) {
            try {
                const cmd = new client_sqs_1.ReceiveMessageCommand({
                    QueueUrl: queueUrl,
                    WaitTimeSeconds: this.waitTimeSeconds,
                    MaxNumberOfMessages: this.maxMessages,
                    MessageSystemAttributeNames: [
                        client_sqs_1.MessageSystemAttributeName.ApproximateReceiveCount,
                    ],
                    ...(this.config.setVisibilityOnReceive
                        ? { VisibilityTimeout: this.visibilityTimeoutSeconds }
                        : {}),
                });
                const response = await sqsClient.send(cmd);
                const messages = response.Messages ?? [];
                if (messages.length > 0) {
                    await Promise.all(messages.map((msg) => this.handleMessage(msg)));
                }
                else if (this.waitTimeSeconds === 0) {
                    // Defensive: when long-polling is disabled (tests, or a misconfig)
                    // an empty receive returns instantly. Yield to the event loop so
                    // the stop signal can propagate and we don't spin a tight loop.
                    await new Promise((r) => setImmediate(r));
                }
            }
            catch (err) {
                if (this.shuttingDown)
                    return;
                const reason = err instanceof Error ? err.message : String(err);
                logger.error(`[SQS Consumer] Poll error — retrying in ${Math.round(this.pollErrorRetryMs / 1000)}s: ${reason}`);
                await sleep(this.pollErrorRetryMs);
            }
        }
    }
    // ── Per-message orchestration ────────────────────────────────────────────
    async handleMessage(msg) {
        this.inflight++;
        try {
            await this.handleMessageInner(msg);
        }
        finally {
            this.inflight--;
        }
    }
    async handleMessageInner(msg) {
        const { parseMessage, dispatchHandler, isPermanentError, checkIdempotent, markProcessing, markProcessed, markFailed, writeHeartbeat, logger, onPermanentError, onTransientError, onEventProcessed, runHandler, consumerName, } = this.config;
        if (!msg.Body || !msg.ReceiptHandle)
            return;
        // ── 1. Parse ────────────────────────────────────────────────────────
        let event = null;
        try {
            event = (await parseMessage(msg.Body, msg)) ?? null;
        }
        catch (err) {
            // Permanent parse error (bad JSON, schema failure, missing required
            // fields) — ack and let the host's onPermanentError do structured
            // ERROR logging. We do NOT log here ourselves: host logging strings
            // (CRM uses console.error '[SQS Consumer] Permanent error - ...',
            // FA uses logger.error with structured fields) must stay stable for
            // log-parsers/dashboards.
            if (onPermanentError) {
                try {
                    await onPermanentError(null, err, msg.Body);
                }
                catch {
                    /* host's logging hook must never break the consumer */
                }
            }
            else {
                const reason = err instanceof Error ? err.message : String(err);
                logger.error(`[SQS Consumer] Unparseable message — deleting to avoid DLQ loop: ${reason}`);
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
        let state;
        try {
            state = await checkIdempotent(event);
        }
        catch (err) {
            // Fail-open: idempotency probe failures should not block forward
            // progress. Both apps explicitly fail open today.
            const reason = err instanceof Error ? err.message : String(err);
            logger.warn(`[SQS Consumer] Idempotency check failed — proceeding fail-open eventId=${event.eventId}: ${reason}`);
            state = 'new';
        }
        if (state === 'processed' || state === 'processing') {
            logger.info(`[SQS Consumer] Duplicate — skipping eventId=${event.eventId} type=${event.eventType}`);
            await this.ack(msg.ReceiptHandle);
            return;
        }
        // ── 3. Mark processing ───────────────────────────────────────────────
        await markProcessing(event);
        // ── 4. Extend visibility while handler runs ──────────────────────────
        const extensionTimer = this.startVisibilityExtension(msg.ReceiptHandle, event.eventId);
        const startedAt = Date.now();
        try {
            // ── 5. Dispatch handler with optional wrapper (e.g. FA circuit breaker) ─
            const baseRunner = () => Promise.race([
                dispatchHandler(event),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`Handler timeout after ${this.handlerTimeoutMs}ms — eventType=${event.eventType} eventId=${event.eventId}`)), this.handlerTimeoutMs)),
            ]);
            const result = runHandler
                ? await runHandler(event, baseRunner)
                : await baseRunner();
            const durationMs = Date.now() - startedAt;
            if (result.success || result.skipped) {
                await markProcessed(event);
                await writeHeartbeat(consumerName, event).catch((hbErr) => logger.warn('[SQS Consumer] Heartbeat upsert failed (non-fatal)', {
                    error: hbErr instanceof Error ? hbErr.message : String(hbErr),
                }));
                await this.ack(msg.ReceiptHandle);
                if (onEventProcessed)
                    onEventProcessed(event, result, durationMs);
            }
            else {
                await markFailed(event, result.error ?? 'handler returned success=false');
                if (onEventProcessed)
                    onEventProcessed(event, result, durationMs);
                await this.applyBackoff(msg, event.eventId);
            }
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            if (isPermanentError(err)) {
                // Permanent → ack + host logs/onPermanentError. Failure-mark is
                // best-effort: if the host's mark-failed path itself dies we still
                // ack to keep the queue moving.
                await markFailed(event, `permanent: ${reason}`).catch(() => { });
                if (onPermanentError) {
                    try {
                        await onPermanentError(event, err, msg.Body);
                    }
                    catch {
                        /* host's logging hook must never break the consumer */
                    }
                }
                else {
                    logger.error(`[SQS Consumer] Permanent error — acking to prevent DLQ spam`, {
                        eventId: event.eventId,
                        eventType: event.eventType,
                        tenantId: event.tenantId,
                        sqsMessageId: event.sqsMessageId,
                        error: reason,
                    });
                }
                await this.ack(msg.ReceiptHandle);
                return;
            }
            // Transient → backoff. Host's onTransientError can log/capture.
            await markFailed(event, reason).catch(() => { });
            if (onTransientError) {
                try {
                    await onTransientError(event, err);
                }
                catch {
                    /* host hook must never break the consumer */
                }
            }
            else {
                logger.error(`[SQS Consumer] Unhandled exception for eventId=${event.eventId}: ${reason}`);
            }
            await this.applyBackoff(msg, event.eventId).catch(() => { });
        }
        finally {
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
    async applyBackoff(msg, eventId) {
        const receiveCount = parseInt(msg.Attributes?.ApproximateReceiveCount ?? '1', 10);
        if (receiveCount >= this.maxAttempts) {
            this.config.logger.error(`[SQS Consumer] Max retries reached for eventId=${eventId} — SQS will move to DLQ`);
            return;
        }
        const backoffSec = this.backoff(receiveCount);
        this.config.logger.warn(`[SQS Consumer] Retry eventId=${eventId} in ${backoffSec}s (attempt ${receiveCount})`);
        await this.changeVisibility(msg.ReceiptHandle, backoffSec).catch(() => { });
    }
    // ── Visibility extension during long-running handlers ───────────────────
    startVisibilityExtension(receiptHandle, eventId) {
        const intervalMs = Math.max((this.visibilityTimeoutSeconds / 2) * 1000, 10000);
        const timer = setInterval(async () => {
            try {
                await this.changeVisibility(receiptHandle, this.visibilityTimeoutSeconds);
            }
            catch {
                // Non-fatal — if extend fails the message may re-deliver; idempotency handles it.
                this.config.logger.debug?.(`[SQS Consumer] Visibility extension failed for eventId=${eventId} (non-fatal)`);
            }
        }, intervalMs);
        if (typeof timer.unref === 'function') {
            timer.unref();
        }
        return timer;
    }
    // ── SQS client wrappers ──────────────────────────────────────────────────
    async ack(receiptHandle) {
        if (!receiptHandle)
            return;
        try {
            await this.config.sqsClient.send(new client_sqs_1.DeleteMessageCommand({
                QueueUrl: this.config.queueUrl,
                ReceiptHandle: receiptHandle,
            }));
        }
        catch (err) {
            this.config.logger.warn('[SQS Consumer] DeleteMessage failed (message may re-deliver)', { error: err instanceof Error ? err.message : String(err) });
        }
    }
    async changeVisibility(receiptHandle, seconds) {
        await this.config.sqsClient.send(new client_sqs_1.ChangeMessageVisibilityCommand({
            QueueUrl: this.config.queueUrl,
            ReceiptHandle: receiptHandle,
            VisibilityTimeout: seconds,
        }));
    }
}
exports.BaseSQSConsumer = BaseSQSConsumer;
// ── Internal helper ──────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
//# sourceMappingURL=base-sqs-consumer.js.map