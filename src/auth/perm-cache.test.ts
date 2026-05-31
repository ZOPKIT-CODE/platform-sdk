import { describe, it, expect } from 'vitest';
import { memoryCache, redisCache, type CachedGrants, type MinimalRedisClient } from './perm-cache';

const grants = (perms: string[]): CachedGrants => ({ permissions: perms, roles: [], permsVersion: 'v1:x' });

describe('memoryCache', () => {
  it('get/set/del round-trips', async () => {
    const c = memoryCache();
    expect(await c.get('k')).toBeNull();
    await c.set('k', grants(['a']), 60);
    expect((await c.get('k'))?.permissions).toEqual(['a']);
    await c.del('k');
    expect(await c.get('k')).toBeNull();
  });

  it('delByPrefix removes matching keys only', async () => {
    const c = memoryCache();
    await c.set('perms:accounting:u1:t1', grants(['a']), 60);
    await c.set('perms:accounting:u1:t2', grants(['b']), 60);
    await c.set('perms:accounting:u2:t1', grants(['c']), 60);
    await c.delByPrefix('perms:accounting:u1:');
    expect(await c.get('perms:accounting:u1:t1')).toBeNull();
    expect(await c.get('perms:accounting:u1:t2')).toBeNull();
    expect((await c.get('perms:accounting:u2:t1'))?.permissions).toEqual(['c']);
  });

  it('expires entries past their TTL', async () => {
    const c = memoryCache();
    await c.set('k', grants(['a']), 0.01); // 10ms
    await new Promise((r) => setTimeout(r, 30));
    expect(await c.get('k')).toBeNull();
  });
});

// A fake client implementing the minimal ioredis-shaped surface, backed by a Map.
function fakeRedis(): MinimalRedisClient & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(k) { return store.get(k) ?? null; },
    async set(k, v) { store.set(k, v); return 'OK'; },
    async del(...keys) { let n = 0; for (const k of keys) { if (store.delete(k)) n++; } return n; },
    async scan(cursor, _m, pattern, _c, _count) {
      // single-pass scan good enough for tests; pattern is `${prefix}*`
      const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix));
      return ['0', keys];
    },
  };
}

describe('redisCache', () => {
  it('serializes through the client and round-trips', async () => {
    const client = fakeRedis();
    const c = redisCache(client);
    await c.set('k', grants(['a', 'b']), 60);
    expect(client.store.get('k')).toContain('"permissions"');
    expect((await c.get('k'))?.permissions).toEqual(['a', 'b']);
    await c.del('k');
    expect(await c.get('k')).toBeNull();
  });

  it('treats corrupt JSON as a miss', async () => {
    const client = fakeRedis();
    client.store.set('k', 'not-json');
    expect(await redisCache(client).get('k')).toBeNull();
  });

  it('delByPrefix uses SCAN and removes only matching keys', async () => {
    const client = fakeRedis();
    const c = redisCache(client);
    await c.set('perms:crm:u1:t1', grants(['a']), 60);
    await c.set('perms:crm:u1:t2', grants(['b']), 60);
    await c.set('perms:crm:u2:t1', grants(['c']), 60);
    await c.delByPrefix('perms:crm:u1:');
    expect(await c.get('perms:crm:u1:t1')).toBeNull();
    expect(await c.get('perms:crm:u1:t2')).toBeNull();
    expect((await c.get('perms:crm:u2:t1'))?.permissions).toEqual(['c']);
  });
});
