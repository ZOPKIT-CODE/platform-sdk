import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  type CircuitState,
} from './circuit-breaker';

describe('resilience/circuit-breaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeBreaker(overrides: Partial<{
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxCalls: number;
    onStateChange: (t: {
      name: string;
      from: CircuitState;
      to: CircuitState;
      at: Date;
      reason?: string;
    }) => void;
  }> = {}) {
    return new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      halfOpenMaxCalls: 1,
      ...overrides,
    });
  }

  it('starts in the closed state', () => {
    const breaker = makeBreaker();
    expect(breaker.getState()).toBe('closed');
  });

  it('lets calls pass through while closed', async () => {
    const breaker = makeBreaker();
    const result = await breaker.execute(async () => 42);
    expect(result).toBe(42);
    expect(breaker.getState()).toBe('closed');
  });

  it('transitions to open after failureThreshold consecutive failures', async () => {
    const breaker = makeBreaker({ failureThreshold: 3 });

    const fn = vi.fn().mockRejectedValue(new Error('boom'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('boom');
    }

    expect(breaker.getState()).toBe('open');
  });

  it('a success resets the failure counter while closed', async () => {
    const breaker = makeBreaker({ failureThreshold: 3 });

    await expect(breaker.execute(async () => { throw new Error('a'); })).rejects.toThrow();
    await expect(breaker.execute(async () => { throw new Error('b'); })).rejects.toThrow();
    // success resets counter
    await breaker.execute(async () => 1);

    // Now we need 3 more failures, not 1.
    await expect(breaker.execute(async () => { throw new Error('c'); })).rejects.toThrow();
    expect(breaker.getState()).toBe('closed');
  });

  it('while OPEN, execute() throws CircuitBreakerOpenError without calling fn', async () => {
    const breaker = makeBreaker({ failureThreshold: 2 });

    const failingFn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(breaker.execute(failingFn)).rejects.toThrow('boom');
    await expect(breaker.execute(failingFn)).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('open');

    const probeFn = vi.fn().mockResolvedValue('should not run');
    await expect(breaker.execute(probeFn)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(probeFn).not.toHaveBeenCalled();
  });

  it('CircuitBreakerOpenError exposes circuitName and retryAfterMs', async () => {
    const breaker = makeBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    await expect(
      breaker.execute(async () => { throw new Error('boom'); }),
    ).rejects.toThrow();

    try {
      await breaker.execute(async () => 'noop');
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitBreakerOpenError);
      const cbe = err as CircuitBreakerOpenError;
      expect(cbe.circuitName).toBe('test');
      expect(cbe.retryAfterMs).toBeGreaterThan(0);
      expect(cbe.retryAfterMs).toBeLessThanOrEqual(1000);
    }
  });

  it('after resetTimeoutMs, state transitions to half-open and the next call goes through', async () => {
    const breaker = makeBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });

    await expect(
      breaker.execute(async () => { throw new Error('boom'); }),
    ).rejects.toThrow();
    expect(breaker.getState()).toBe('open');

    vi.advanceTimersByTime(1000);

    // getState() should lazily promote to half-open after the reset window.
    expect(breaker.getState()).toBe('half-open');

    const probe = vi.fn().mockResolvedValue('probe-ok');
    const result = await breaker.execute(probe);
    expect(result).toBe('probe-ok');
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('half-open → closed on probe success', async () => {
    const breaker = makeBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      halfOpenMaxCalls: 1,
    });

    await expect(
      breaker.execute(async () => { throw new Error('boom'); }),
    ).rejects.toThrow();
    vi.advanceTimersByTime(1000);
    expect(breaker.getState()).toBe('half-open');

    await breaker.execute(async () => 'ok');
    expect(breaker.getState()).toBe('closed');
  });

  it('half-open → open on probe failure', async () => {
    const breaker = makeBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      halfOpenMaxCalls: 1,
    });

    await expect(
      breaker.execute(async () => { throw new Error('boom'); }),
    ).rejects.toThrow();
    vi.advanceTimersByTime(1000);
    expect(breaker.getState()).toBe('half-open');

    await expect(
      breaker.execute(async () => { throw new Error('half-open-fail'); }),
    ).rejects.toThrow('half-open-fail');
    expect(breaker.getState()).toBe('open');
  });

  it('fires onStateChange on each transition', async () => {
    const onStateChange = vi.fn();
    const breaker = makeBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      halfOpenMaxCalls: 1,
      onStateChange,
    });

    // closed -> open
    await expect(
      breaker.execute(async () => { throw new Error('boom'); }),
    ).rejects.toThrow();
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange.mock.calls[0][0]).toMatchObject({
      name: 'test',
      from: 'closed',
      to: 'open',
    });

    // open -> half-open (lazy promotion)
    vi.advanceTimersByTime(1000);
    expect(breaker.getState()).toBe('half-open');
    expect(onStateChange).toHaveBeenCalledTimes(2);
    expect(onStateChange.mock.calls[1][0]).toMatchObject({
      from: 'open',
      to: 'half-open',
    });

    // half-open -> closed
    await breaker.execute(async () => 'ok');
    expect(onStateChange).toHaveBeenCalledTimes(3);
    expect(onStateChange.mock.calls[2][0]).toMatchObject({
      from: 'half-open',
      to: 'closed',
    });
  });

  it('isFailure predicate can exclude certain errors from tripping the breaker', async () => {
    const isFailure = (err: unknown) => {
      if (err instanceof Error && err.message.startsWith('4xx:')) return false;
      return true;
    };
    const breaker = makeBreaker({ failureThreshold: 2 });
    const breakerWithPred = new CircuitBreaker({
      name: 'pred',
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      halfOpenMaxCalls: 1,
      isFailure,
    });

    // 4xx errors should not trip
    await expect(
      breakerWithPred.execute(async () => { throw new Error('4xx: bad request'); }),
    ).rejects.toThrow();
    await expect(
      breakerWithPred.execute(async () => { throw new Error('4xx: bad request'); }),
    ).rejects.toThrow();
    expect(breakerWithPred.getState()).toBe('closed');

    // 5xx-style still does
    await expect(
      breakerWithPred.execute(async () => { throw new Error('5xx: server'); }),
    ).rejects.toThrow();
    await expect(
      breakerWithPred.execute(async () => { throw new Error('5xx: server'); }),
    ).rejects.toThrow();
    expect(breakerWithPred.getState()).toBe('open');

    // sanity that the other breaker isn't somehow polluted
    expect(breaker.getState()).toBe('closed');
  });

  it('reset() forces back to closed and clears counters', async () => {
    const breaker = makeBreaker({ failureThreshold: 1 });
    await expect(
      breaker.execute(async () => { throw new Error('boom'); }),
    ).rejects.toThrow();
    expect(breaker.getState()).toBe('open');

    breaker.reset('test reset');
    expect(breaker.getState()).toBe('closed');
    expect(breaker.getStats().failureCount).toBe(0);
    expect(breaker.getStats().openedAt).toBeNull();
  });

  it('onStateChange callback errors do not propagate', async () => {
    const onStateChange = vi.fn(() => {
      throw new Error('callback exploded');
    });
    const breaker = makeBreaker({ failureThreshold: 1, onStateChange });

    await expect(
      breaker.execute(async () => { throw new Error('boom'); }),
    ).rejects.toThrow('boom'); // the original error, not the callback error
    expect(breaker.getState()).toBe('open');
  });
});
