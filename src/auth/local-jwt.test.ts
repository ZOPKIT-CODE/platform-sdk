import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock jose so verifyJwt's signature step is a controllable no-op — we are testing the
// revocation logic that runs AFTER signature verification, not jose itself.
const h = vi.hoisted(() => ({ payload: { jti: 'seed', sub: 'u' } as Record<string, unknown> }));
vi.mock('jose', () => ({
  createRemoteJWKSet: () => () => ({}),
  jwtVerify: async () => ({ payload: h.payload }),
}));

import { verifyJwt, revokeToken, configureRevocation, RevocationCheckUnavailableError } from './local-jwt';

interface FakeRedis {
  data: Map<string, string>;
  fail: boolean;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: 'EX', ttl: number) => Promise<unknown>;
  del: (...keys: string[]) => Promise<number>;
  scan: (c: string, m: 'MATCH', p: string, ct: 'COUNT', n: number) => Promise<[string, string[]]>;
}

function makeRedis(): FakeRedis {
  const store: FakeRedis = {
    data: new Map(),
    fail: false,
    get: vi.fn(async (key: string) => {
      if (store.fail) throw new Error('redis unreachable');
      return store.data.get(key) ?? null;
    }),
    set: vi.fn(async (key: string, value: string) => {
      store.data.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async () => 0),
    scan: vi.fn(async () => ['0', []] as [string, string[]]),
  };
  return store;
}

const CFG = { jwksUri: 'https://example.test/.well-known/jwks.json' };

describe('verifyJwt shared revocation store', () => {
  beforeEach(() => {
    configureRevocation({ client: null }); // reset to no shared store between tests
    h.payload = { jti: 'seed', sub: 'u' };
  });

  it('rejects a token whose jti is in the shared store (cross-node revocation)', async () => {
    const redis = makeRedis();
    redis.data.set('revoked:jti:tok-A', '1');
    configureRevocation({ client: redis });
    h.payload = { jti: 'tok-A', sub: 'u' };
    await expect(verifyJwt('t', CFG)).rejects.toThrow(/revoked/i);
    expect(redis.get).toHaveBeenCalledWith('revoked:jti:tok-A');
  });

  it('revokeToken writes to the shared store with a TTL, and that token then fails to verify', async () => {
    const redis = makeRedis();
    configureRevocation({ client: redis, ttlSeconds: 900 });
    await revokeToken('tok-B');
    expect(redis.set).toHaveBeenCalledWith('revoked:jti:tok-B', '1', 'EX', 900);
    h.payload = { jti: 'tok-B', sub: 'u' };
    await expect(verifyJwt('t', CFG)).rejects.toThrow(/revoked/i);
  });

  it('FAIL-CLOSED: a shared-store error during verify rejects with RevocationCheckUnavailableError', async () => {
    const redis = makeRedis();
    redis.fail = true;
    configureRevocation({ client: redis });
    h.payload = { jti: 'tok-C', sub: 'u' }; // not locally revoked
    await expect(verifyJwt('t', CFG)).rejects.toBeInstanceOf(RevocationCheckUnavailableError);
  });

  it('allows a token that is not revoked when the store is reachable', async () => {
    const redis = makeRedis();
    configureRevocation({ client: redis });
    h.payload = { jti: 'tok-D', sub: 'u' };
    const res = await verifyJwt('t', CFG);
    expect(res.payload.jti).toBe('tok-D');
  });

  it('with no shared store configured, a token verifies (local-LRU-only, backward compatible)', async () => {
    configureRevocation({ client: null });
    h.payload = { jti: 'tok-E', sub: 'u' };
    const res = await verifyJwt('t', CFG);
    expect(res.payload.jti).toBe('tok-E');
  });
});
