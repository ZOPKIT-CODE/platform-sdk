"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permsVersion = permsVersion;
exports.matchPermission = matchPermission;
exports.createAuthorizer = createAuthorizer;
/**
 * Platform authorization core (framework-agnostic).
 *
 * RBAC over permission strings `<app>.<module>.<action>`. Resolves a user's grants
 * SERVER-SIDE (cache → app-provided `loadGrants`) instead of trusting a permission
 * list in the token — so tokens stay tiny (no 431) and permission changes take effect
 * within the cache TTL / on invalidation rather than at token expiry.
 *
 * Pure: imports no web framework. Each app wraps `decide()` in a ~10-line preHandler.
 * The Fastify 4 (finance-accounting) vs Fastify 5 (b2b-crm) split is why this is a core,
 * not a plugin.
 */
const node_crypto_1 = require("node:crypto");
const perm_cache_1 = require("./perm-cache");
const ACTION_RE = /^(.*)\.(read|read_all)$/;
/** Stable, order-independent hash of a permission set. */
function permsVersion(permissions) {
    const sorted = [...new Set(permissions)].sort();
    return 'v1:' + (0, node_crypto_1.createHash)('sha256').update(sorted.join('\n')).digest('hex').slice(0, 16);
}
/**
 * Does `required` (a concrete `app.module.action`) match any grant in `grants`?
 *  - exact match
 *  - wildcards in a GRANT: '*', 'app.*', 'app.module.*'  (a grant may be broad)
 *  - read ↔ read_all equivalence (either satisfies the other), matching FA semantics
 */
function matchPermission(grants, required) {
    if (grants.has(required) || grants.has('*'))
        return true;
    // Wildcard grants: a grant ending in '.*' covers everything under its prefix.
    const segs = required.split('.');
    for (let i = 1; i < segs.length; i++) {
        if (grants.has(segs.slice(0, i).join('.') + '.*'))
            return true;
    }
    // read ↔ read_all equivalence
    const m = ACTION_RE.exec(required);
    if (m) {
        const base = m[1];
        const alt = m[2] === 'read' ? `${base}.read_all` : `${base}.read`;
        if (grants.has(alt))
            return true;
    }
    return false;
}
function createAuthorizer(config) {
    const cache = config.cache ?? (0, perm_cache_1.memoryCache)({ ttlSeconds: config.ttlSeconds ?? 300 });
    const ttl = config.ttlSeconds ?? 300;
    const failOpen = config.failMode === 'open';
    const log = config.logger;
    // Key as {app}:{tenant}:{user} so a whole tenant can be invalidated by prefix
    // (a role's permissions changing affects every user in that tenant). Per-user
    // invalidation uses the exact key.
    const keyFor = (userId, tenantId) => `perms:${config.appId}:${tenantId}:${userId}`;
    const tenantPrefix = (tenantId) => `perms:${config.appId}:${tenantId}:`;
    // In-flight dedup: concurrent misses for the same key share one loadGrants call.
    const inflight = new Map();
    async function resolve(userId, tenantId) {
        const key = keyFor(userId, tenantId);
        try {
            const hit = await cache.get(key);
            if (hit)
                return hit;
        }
        catch (err) {
            log?.warn({ err, key }, '[authz] cache.get failed — resolving from source');
        }
        const existing = inflight.get(key);
        if (existing)
            return existing;
        const p = (async () => {
            const loaded = await config.loadGrants(userId, tenantId);
            const permissions = loaded?.permissions ?? [];
            const value = {
                permissions,
                roles: loaded?.roles ?? [],
                permsVersion: permsVersion(permissions),
            };
            try {
                await cache.set(key, value, ttl);
            }
            catch (err) {
                log?.warn({ err, key }, '[authz] cache.set failed (non-fatal)');
            }
            return value;
        })();
        inflight.set(key, p);
        try {
            return await p;
        }
        finally {
            inflight.delete(key);
        }
    }
    function can(grants, required) {
        return matchPermission(new Set(grants), required);
    }
    async function decide(claims, required) {
        // Dual-read: a legacy fat token with embedded permissions is honored as-is.
        if (Array.isArray(claims.permissions) && claims.permissions.length > 0) {
            const allowed = can(claims.permissions, required);
            return {
                allowed,
                permissions: claims.permissions,
                roles: claims.roles ?? [],
                source: 'token',
                ...(allowed ? {} : { reason: `missing:${required}` }),
            };
        }
        // Slim token → resolve server-side.
        if (!claims.userId || !claims.tenantId) {
            return { allowed: failOpen, permissions: [], roles: [], source: 'none', reason: 'missing:identity' };
        }
        try {
            const grants = await resolve(claims.userId, claims.tenantId);
            const allowed = can(grants.permissions, required);
            return {
                allowed,
                permissions: grants.permissions,
                roles: grants.roles,
                source: grants.permissions.length ? 'load' : 'cache',
                ...(allowed ? {} : { reason: `missing:${required}` }),
            };
        }
        catch (err) {
            // Resolution failed (DB/cache outage): fail closed unless explicitly opened.
            log?.warn({ err, userId: claims.userId }, '[authz] grant resolution failed — applying failMode');
            return { allowed: failOpen, permissions: [], roles: [], source: 'none', reason: 'resolve_error' };
        }
    }
    async function invalidate(userId, tenantId) {
        inflight.delete(keyFor(userId, tenantId));
        await cache.del(keyFor(userId, tenantId));
    }
    async function invalidateTenant(tenantId) {
        await cache.delByPrefix(tenantPrefix(tenantId));
    }
    return { resolve, can, decide, invalidate, invalidateTenant };
}
//# sourceMappingURL=authorizer.js.map