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

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Failures within the closed-state window that flip the breaker open. */
  failureThreshold: number;
  /** Milliseconds to stay open before allowing a half-open probe. */
  resetTimeoutMs: number;
  /** Max in-flight calls allowed during half-open before deciding. */
  halfOpenMaxCalls: number;
  /** Human-readable name; surfaced in errors and onStateChange callbacks. */
  name: string;
  /** Optional callback fired on every state transition. */
  onStateChange?: (transition: {
    name: string;
    from: CircuitState;
    to: CircuitState;
    at: Date;
    reason?: string;
  }) => void;
  /**
   * Predicate to decide whether a thrown error should count as a failure.
   * Defaults to "all thrown errors count". Use this to exclude e.g.
   * client/4xx errors from tripping the breaker.
   */
  isFailure?: (err: unknown) => boolean;
}

export class CircuitBreakerOpenError extends Error {
  readonly circuitName: string;
  readonly retryAfterMs: number;

  constructor(name: string, retryAfterMs: number) {
    super(`Circuit breaker '${name}' is open — failing fast (retry in ${retryAfterMs}ms)`);
    this.name = 'CircuitBreakerOpenError';
    this.circuitName = name;
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private openedAt: number | null = null;
  private halfOpenInFlight = 0;
  private halfOpenSuccesses = 0;
  private halfOpenFailures = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxCalls: number;
  private readonly name: string;
  private readonly onStateChange?: CircuitBreakerOptions['onStateChange'];
  private readonly isFailure: (err: unknown) => boolean;

  constructor(opts: CircuitBreakerOptions) {
    this.failureThreshold = opts.failureThreshold;
    this.resetTimeoutMs = opts.resetTimeoutMs;
    this.halfOpenMaxCalls = opts.halfOpenMaxCalls;
    this.name = opts.name;
    this.onStateChange = opts.onStateChange;
    this.isFailure = opts.isFailure ?? (() => true);
  }

  /** Current state — useful for /health endpoints and tests. */
  getState(): CircuitState {
    // Lazily promote open → half-open if the reset window has passed.
    if (this.state === 'open' && this.openedAt !== null) {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.transition('half-open', 'reset timeout elapsed');
      }
    }
    return this.state;
  }

  /** Snapshot for telemetry / debugging. */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    openedAt: Date | null;
    halfOpenInFlight: number;
    halfOpenSuccesses: number;
    halfOpenFailures: number;
  } {
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
  reset(reason = 'manual reset'): void {
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
  async execute<T>(fn: () => Promise<T>): Promise<T> {
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
    } catch (err) {
      if (this.isFailure(err)) {
        this.onFailure(state, err);
      } else if (state === 'half-open') {
        // Non-failure error in half-open still releases the slot.
        this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
      }
      throw err;
    }
  }

  // ── private ────────────────────────────────────────────────────────────

  private onSuccess(callState: CircuitState): void {
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
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(callState: CircuitState, err: unknown): void {
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

  private transition(to: CircuitState, reason?: string): void {
    const from = this.state;
    if (from === to) return;
    this.state = to;
    if (to === 'half-open') {
      this.halfOpenInFlight = 0;
      this.halfOpenSuccesses = 0;
      this.halfOpenFailures = 0;
    }
    if (this.onStateChange) {
      try {
        this.onStateChange({ name: this.name, from, to, at: new Date(), reason });
      } catch {
        // never let a callback failure propagate
      }
    }
  }
}
