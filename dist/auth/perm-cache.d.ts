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
export declare function memoryCache(opts?: MemoryCacheOptions): PermCache;
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
export declare function redisCache(client: MinimalRedisClient, opts?: RedisCacheOptions): PermCache;
//# sourceMappingURL=perm-cache.d.ts.map