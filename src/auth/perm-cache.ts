/**
 * Permission cache port + adapters (platform authorization).
 *
 * The authorizer depends on this small interface — NOT on any concrete cache
 * client. Apps pass `memoryCache()` (single-node/dev) or `redisCache(client)`
 * (multi-node) with zero change to the authorizer or their own code. The Redis
 * adapter is typed against a minimal structural client (the shape ioredis and
 * node-redis both satisfy), so the SDK has no runtime dependency on a Redis lib.
 */
import { LRUCache } from 'lru-cache';

/** Resolved grants stored in the cache for one (app,user,tenant). */
export interface CachedGrants {
  permissions: string[];
  roles: string[];
  /** Stable hash of the grant set — used to detect change without a token reissue. */
  permsVersion: string;
}

/** The contract the authorizer needs. Keep it tiny so any backend can implement it. */
export interface PermCache {
  get(key: string): Promise<CachedGrants | null>;
  set(key: string, value: CachedGrants, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Delete every key starting with `prefix` (e.g. invalidate all of a user's tenants). */
  delByPrefix(prefix: string): Promise<void>;
}

// ─── In-memory adapter (single node / dev / fallback) ───────────────────────

export interface MemoryCacheOptions {
  /** Max distinct (app,user,tenant) entries kept. Default 50k. */
  max?: number;
  /** Default TTL ceiling in seconds (per-entry TTL still applies). Default 600. */
  ttlSeconds?: number;
}

/**
 * LRU-backed cache. Correct on a single instance; for multi-node use `redisCache`
 * so invalidation is shared. Also the safe FALLBACK when Redis is unreachable.
 */
export function memoryCache(opts: MemoryCacheOptions = {}): PermCache {
  const store = new LRUCache<string, CachedGrants>({
    max: opts.max ?? 50_000,
    ttl: (opts.ttlSeconds ?? 600) * 1000,
  });
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, ttlSeconds) {
      store.set(key, value, { ttl: ttlSeconds * 1000 });
    },
    async del(key) {
      store.delete(key);
    },
    async delByPrefix(prefix) {
      for (const k of store.keys()) {
        if (k.startsWith(prefix)) store.delete(k);
      }
    },
  };
}

// ─── Redis adapter (multi-node) ─────────────────────────────────────────────

/**
 * Minimal Redis client surface used by the adapter. Both `ioredis` and
 * `node-redis` (v4, with the legacy-style signature) satisfy this structurally,
 * so the SDK depends on the SHAPE, not the package. The app constructs and owns
 * the client (connection, TLS, cluster).
 */
export interface MinimalRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  scan(cursor: string, matchToken: 'MATCH', pattern: string, countToken: 'COUNT', count: number): Promise<[string, string[]]>;
}

export interface RedisCacheOptions {
  /** SCAN batch size when deleting by prefix. Default 200. */
  scanCount?: number;
}

/**
 * Redis/Valkey-backed shared cache. Values are JSON; TTL via `SET … EX`.
 * `delByPrefix` uses non-blocking SCAN (never KEYS) so it is production-safe.
 */
export function redisCache(client: MinimalRedisClient, opts: RedisCacheOptions = {}): PermCache {
  const scanCount = opts.scanCount ?? 200;
  return {
    async get(key) {
      const raw = await client.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as CachedGrants;
      } catch {
        return null; // corrupt entry → treat as miss
      }
    },
    async set(key, value, ttlSeconds) {
      await client.set(key, JSON.stringify(value), 'EX', Math.max(1, Math.floor(ttlSeconds)));
    },
    async del(key) {
      await client.del(key);
    },
    async delByPrefix(prefix) {
      let cursor = '0';
      do {
        const [next, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', scanCount);
        cursor = next;
        if (keys.length) await client.del(...keys);
      } while (cursor !== '0');
    },
  };
}
