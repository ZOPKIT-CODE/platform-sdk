import { type PermCache, type CachedGrants } from './perm-cache';
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
/** Stable, order-independent hash of a permission set. */
export declare function permsVersion(permissions: string[]): string;
/**
 * Does `required` (a concrete `app.module.action`) match any grant in `grants`?
 *  - exact match
 *  - wildcards in a GRANT: '*', 'app.*', 'app.module.*'  (a grant may be broad)
 *  - read ↔ read_all equivalence (either satisfies the other), matching FA semantics
 */
export declare function matchPermission(grants: ReadonlySet<string>, required: string): boolean;
export declare function createAuthorizer(config: AuthorizerConfig): Authorizer;
//# sourceMappingURL=authorizer.d.ts.map