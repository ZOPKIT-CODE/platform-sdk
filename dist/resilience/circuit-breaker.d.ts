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
export declare class CircuitBreakerOpenError extends Error {
    readonly circuitName: string;
    readonly retryAfterMs: number;
    constructor(name: string, retryAfterMs: number);
}
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private openedAt;
    private halfOpenInFlight;
    private halfOpenSuccesses;
    private halfOpenFailures;
    private readonly failureThreshold;
    private readonly resetTimeoutMs;
    private readonly halfOpenMaxCalls;
    private readonly name;
    private readonly onStateChange?;
    private readonly isFailure;
    constructor(opts: CircuitBreakerOptions);
    /** Current state — useful for /health endpoints and tests. */
    getState(): CircuitState;
    /** Snapshot for telemetry / debugging. */
    getStats(): {
        state: CircuitState;
        failureCount: number;
        openedAt: Date | null;
        halfOpenInFlight: number;
        halfOpenSuccesses: number;
        halfOpenFailures: number;
    };
    /** Force the breaker back to closed. Resets all counters. Intended for ops/tests. */
    reset(reason?: string): void;
    /** Execute `fn` through the breaker. Throws `CircuitBreakerOpenError` when open. */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private transition;
}
//# sourceMappingURL=circuit-breaker.d.ts.map