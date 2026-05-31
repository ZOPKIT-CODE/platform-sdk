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
import { createHash } from 'node:crypto';
import { memoryCache, type PermCache, type CachedGrants } from './perm-cache';

/** Raw grants an app's `loadGrants` returns for one (user, tenant). */
export interface LoadedGrants {
  permissions: string[];
  roles?: string[];
}

export interface AuthorizerLogger {
  warn(obj: unknown, msg?: string): void;
  debug?(obj: unknown, msg?: string): void;
}

export interface AuthorizerConfig {
  /** App namespace, e.g. 'accounting' | 'crm'. Used for the cache key and (optionally) to scope checks. */
  appId: string;
  /**
   * App-provided port: return the permission strings (+ roles) for this user in this
   * tenant, read from the app's own synced wrapper-role tables. The SDK never touches
   * an app's schema. Return null/[] for "no grants" (→ deny).
   */
  loadGrants(userId: string, tenantId: string): Promise<LoadedGrants | null>;
  /** Shared cache. Defaults to an in-memory LRU (single-node). Use redisCache() for multi-node. */
  cache?: PermCache;
  /** Cache TTL seconds. Default 300. */
  ttlSeconds?: number;
  /** On loadGrants/cache failure: 'closed' = deny (default, recommended), 'open' = allow. */
  failMode?: 'closed' | 'open';
  logger?: AuthorizerLogger;
}

/** Claims the authorizer needs off a verified token. */
export interface AuthClaims {
  userId: string;
  tenantId: string;
  /** Legacy fat-token permissions. When present + non-empty they are used as-is (dual-read). */
  permissions?: string[];
  roles?: string[];
}

export interface AuthDecision {
  allowed: boolean;
  permissions: string[];
  roles: string[];
  /** On deny, the specific code that was missing (for server-side audit; do not leak verbatim). */
  reason?: string;
  /** Where the grants came from — for metrics. */
  source: 'token' | 'cache' | 'load' | 'none';
}

export interface Authorizer {
  /** Resolve a user's grants (cache → loadGrants), honoring failMode. */
  resolve(userId: string, tenantId: string): Promise<CachedGrants>;
  /** Pure check: does this grant set satisfy `required`? Supports wildcards + read/read_all. */
  can(grants: string[], required: string): boolean;
  /** Full decision for a request: dual-read (token perms if present, else resolve). */
  decide(claims: AuthClaims, required: string): Promise<AuthDecision>;
  /** Invalidate one (user, tenant) — e.g. role assigned/unassigned to a user. */
  invalidate(userId: string, tenantId: string): Promise<void>;
  /** Invalidate every cached user in a tenant — e.g. a role's permissions changed. */
  invalidateTenant(tenantId: string): Promise<void>;
}

const ACTION_RE = /^(.*)\.(read|read_all)$/;

/** Stable, order-independent hash of a permission set. */
export function permsVersion(permissions: string[]): string {
  const sorted = [...new Set(permissions)].sort();
  return 'v1:' + createHash('sha256').update(sorted.join('\n')).digest('hex').slice(0, 16);
}

/**
 * Does `required` (a concrete `app.module.action`) match any grant in `grants`?
 *  - exact match
 *  - wildcards in a GRANT: '*', 'app.*', 'app.module.*'  (a grant may be broad)
 *  - read ↔ read_all equivalence (either satisfies the other), matching FA semantics
 */
export function matchPermission(grants: ReadonlySet<string>, required: string): boolean {
  if (grants.has(required) || grants.has('*')) return true;

  // Wildcard grants: a grant ending in '.*' covers everything under its prefix.
  const segs = required.split('.');
  for (let i = 1; i < segs.length; i++) {
    if (grants.has(segs.slice(0, i).join('.') + '.*')) return true;
  }

  // read ↔ read_all equivalence
  const m = ACTION_RE.exec(required);
  if (m) {
    const base = m[1];
    const alt = m[2] === 'read' ? `${base}.read_all` : `${base}.read`;
    if (grants.has(alt)) return true;
  }
  return false;
}

export function createAuthorizer(config: AuthorizerConfig): Authorizer {
  const cache = config.cache ?? memoryCache({ ttlSeconds: config.ttlSeconds ?? 300 });
  const ttl = config.ttlSeconds ?? 300;
  const failOpen = config.failMode === 'open';
  const log = config.logger;
  // Key as {app}:{tenant}:{user} so a whole tenant can be invalidated by prefix
  // (a role's permissions changing affects every user in that tenant). Per-user
  // invalidation uses the exact key.
  const keyFor = (userId: string, tenantId: string) => `perms:${config.appId}:${tenantId}:${userId}`;
  const tenantPrefix = (tenantId: string) => `perms:${config.appId}:${tenantId}:`;

  // In-flight dedup: concurrent misses for the same key share one loadGrants call.
  const inflight = new Map<string, Promise<CachedGrants>>();

  async function resolve(userId: string, tenantId: string): Promise<CachedGrants> {
    const key = keyFor(userId, tenantId);
    try {
      const hit = await cache.get(key);
      if (hit) return hit;
    } catch (err) {
      log?.warn({ err, key }, '[authz] cache.get failed — resolving from source');
    }

    const existing = inflight.get(key);
    if (existing) return existing;

    const p = (async (): Promise<CachedGrants> => {
      const loaded = await config.loadGrants(userId, tenantId);
      const permissions = loaded?.permissions ?? [];
      const value: CachedGrants = {
        permissions,
        roles: loaded?.roles ?? [],
        permsVersion: permsVersion(permissions),
      };
      try {
        await cache.set(key, value, ttl);
      } catch (err) {
        log?.warn({ err, key }, '[authz] cache.set failed (non-fatal)');
      }
      return value;
    })();

    inflight.set(key, p);
    try {
      return await p;
    } finally {
      inflight.delete(key);
    }
  }

  function can(grants: string[], required: string): boolean {
    return matchPermission(new Set(grants), required);
  }

  async function decide(claims: AuthClaims, required: string): Promise<AuthDecision> {
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
    } catch (err) {
      // Resolution failed (DB/cache outage): fail closed unless explicitly opened.
      log?.warn({ err, userId: claims.userId }, '[authz] grant resolution failed — applying failMode');
      return { allowed: failOpen, permissions: [], roles: [], source: 'none', reason: 'resolve_error' };
    }
  }

  async function invalidate(userId: string, tenantId: string): Promise<void> {
    inflight.delete(keyFor(userId, tenantId));
    await cache.del(keyFor(userId, tenantId));
  }

  async function invalidateTenant(tenantId: string): Promise<void> {
    await cache.delByPrefix(tenantPrefix(tenantId));
  }

  return { resolve, can, decide, invalidate, invalidateTenant };
}
