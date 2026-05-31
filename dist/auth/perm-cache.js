"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryCache = memoryCache;
exports.redisCache = redisCache;
/**
 * Permission cache port + adapters (platform authorization).
 *
 * The authorizer depends on this small interface — NOT on any concrete cache
 * client. Apps pass `memoryCache()` (single-node/dev) or `redisCache(client)`
 * (multi-node) with zero change to the authorizer or their own code. The Redis
 * adapter is typed against a minimal structural client (the shape ioredis and
 * node-redis both satisfy), so the SDK has no runtime dependency on a Redis lib.
 */
const lru_cache_1 = require("lru-cache");
/**
 * LRU-backed cache. Correct on a single instance; for multi-node use `redisCache`
 * so invalidation is shared. Also the safe FALLBACK when Redis is unreachable.
 */
function memoryCache(opts = {}) {
    const store = new lru_cache_1.LRUCache({
        max: opts.max ?? 50000,
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
                if (k.startsWith(prefix))
                    store.delete(k);
            }
        },
    };
}
/**
 * Redis/Valkey-backed shared cache. Values are JSON; TTL via `SET … EX`.
 * `delByPrefix` uses non-blocking SCAN (never KEYS) so it is production-safe.
 */
function redisCache(client, opts = {}) {
    const scanCount = opts.scanCount ?? 200;
    return {
        async get(key) {
            const raw = await client.get(key);
            if (!raw)
                return null;
            try {
                return JSON.parse(raw);
            }
            catch {
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
                if (keys.length)
                    await client.del(...keys);
            } while (cursor !== '0');
        },
    };
}
//# sourceMappingURL=perm-cache.js.map