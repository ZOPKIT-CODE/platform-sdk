"use strict";
/**
 * Shared circuit breaker.
 *
 * Consolidates the per-app implementations (wrapper had 68 lines,
 * accounting had 259) into one ~150-line module shared across apps.
 *
 * States:
 *   - closed: normal operation, calls flow through.
 *   - open:   recent failures exceeded threshold; calls fail fast.
 *   - half-open: probe window after the reset timeout. Up to N calls
 *     are allowed through; if all succeed → closed, any fail → open.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.CircuitBreakerOpenError = void 0;
class CircuitBreakerOpenError extends Error {
    constructor(name, retryAfterMs) {
        super(`Circuit breaker '${name}' is open — failing fast (retry in ${retryAfterMs}ms)`);
        this.name = 'CircuitBreakerOpenError';
        this.circuitName = name;
        this.retryAfterMs = retryAfterMs;
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
class CircuitBreaker {
    constructor(opts) {
        this.state = 'closed';
        this.failureCount = 0;
        this.openedAt = null;
        this.halfOpenInFlight = 0;
        this.halfOpenSuccesses = 0;
        this.halfOpenFailures = 0;
        this.failureThreshold = opts.failureThreshold;
        this.resetTimeoutMs = opts.resetTimeoutMs;
        this.halfOpenMaxCalls = opts.halfOpenMaxCalls;
        this.name = opts.name;
        this.onStateChange = opts.onStateChange;
        this.isFailure = opts.isFailure ?? (() => true);
    }
    /** Current state — useful for /health endpoints and tests. */
    getState() {
        // Lazily promote open → half-open if the reset window has passed.
        if (this.state === 'open' && this.openedAt !== null) {
            if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
                this.transition('half-open', 'reset timeout elapsed');
            }
        }
        return this.state;
    }
    /** Snapshot for telemetry / debugging. */
    getStats() {
        return {
            state: this.getState(),
            failureCount: this.failureCount,
            openedAt: this.openedAt !== null ? new Date(this.openedAt) : null,
            halfOpenInFlight: this.halfOpenInFlight,
            halfOpenSuccesses: this.halfOpenSuccesses,
            halfOpenFailures: this.halfOpenFailures,
        };
    }
    /** Force the breaker back to closed. Resets all counters. Intended for ops/tests. */
    reset(reason = 'manual reset') {
        this.failureCount = 0;
        this.openedAt = null;
        this.halfOpenInFlight = 0;
        this.halfOpenSuccesses = 0;
        this.halfOpenFailures = 0;
        if (this.state !== 'closed') {
            this.transition('closed', reason);
        }
    }
    /** Execute `fn` through the breaker. Throws `CircuitBreakerOpenError` when open. */
    async execute(fn) {
        const state = this.getState();
        if (state === 'open') {
            const elapsed = this.openedAt !== null ? Date.now() - this.openedAt : 0;
            const retryAfterMs = Math.max(0, this.resetTimeoutMs - elapsed);
            throw new CircuitBreakerOpenError(this.name, retryAfterMs);
        }
        if (state === 'half-open') {
            if (this.halfOpenInFlight >= this.halfOpenMaxCalls) {
                throw new CircuitBreakerOpenError(this.name, this.resetTimeoutMs);
            }
            this.halfOpenInFlight++;
        }
        try {
            const result = await fn();
            this.onSuccess(state);
            return result;
        }
        catch (err) {
            if (this.isFailure(err)) {
                this.onFailure(state, err);
            }
            else if (state === 'half-open') {
                // Non-failure error in half-open still releases the slot.
                this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
            }
            throw err;
        }
    }
    // ── private ────────────────────────────────────────────────────────────
    onSuccess(callState) {
        if (callState === 'half-open') {
            this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
            this.halfOpenSuccesses++;
            if (this.halfOpenSuccesses >= this.halfOpenMaxCalls) {
                this.failureCount = 0;
                this.openedAt = null;
                this.halfOpenSuccesses = 0;
                this.halfOpenFailures = 0;
                this.transition('closed', 'half-open probes succeeded');
            }
        }
        else {
            this.failureCount = 0;
        }
    }
    onFailure(callState, err) {
        const reason = err instanceof Error ? err.message : String(err);
        if (callState === 'half-open') {
            this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
            this.halfOpenFailures++;
            this.openedAt = Date.now();
            this.halfOpenSuccesses = 0;
            this.halfOpenFailures = 0;
            this.transition('open', `half-open probe failed: ${reason}`);
            return;
        }
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
            this.openedAt = Date.now();
            this.transition('open', `failure threshold reached: ${reason}`);
        }
    }
    transition(to, reason) {
        const from = this.state;
        if (from === to)
            return;
        this.state = to;
        if (to === 'half-open') {
            this.halfOpenInFlight = 0;
            this.halfOpenSuccesses = 0;
            this.halfOpenFailures = 0;
        }
        if (this.onStateChange) {
            try {
                this.onStateChange({ name: this.name, from, to, at: new Date(), reason });
            }
            catch {
                // never let a callback failure propagate
            }
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=circuit-breaker.js.map