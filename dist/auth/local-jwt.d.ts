import { createRemoteJWKSet, type JWTPayload } from 'jose';
import type { MinimalRedisClient } from './perm-cache';
/**
 * Local JWKS token validation (ADR-008).
 *
 * Fetches public keys from the JWKS endpoint once, caches them with the jose
 * library's built-in caching, and validates JWT signatures locally on every
 * request — zero network round-trip on the hot path.
 *
 * This is the industry standard recommended by Auth0, AWS Cognito, and Okta.
 * FA's current approach (per-request Wrapper API call) is incorrect and is
 * corrected by this module (ADR-020).
 */
export interface JwtVerifyConfig {
    /** Full URL to the JWKS endpoint e.g. https://wrapper.example.com/.well-known/jwks.json */
    jwksUri: string;
    /** Expected JWT issuer. Validated if provided. */
    issuer?: string;
    /** Expected JWT audience. Validated if provided. */
    audience?: string;
}
export interface VerifiedToken {
    payload: JWTPayload & WrapperTokenClaims;
    raw: string;
}
/** Claims the Wrapper embeds in its JWTs. */
export interface WrapperTokenClaims {
    sub: string;
    tenantId?: string;
    kindeOrgId?: string;
    userId?: string;
    email?: string;
    role?: string;
    plan?: string;
    iat?: number;
    exp?: number;
}
export interface RevocationConfig {
    /** Shared client (structurally a MinimalRedisClient). Pass null to disable sharing. */
    client: MinimalRedisClient | null;
    /** TTL for a revocation entry; should be >= the access-token lifetime. Default 16 min. */
    ttlSeconds?: number;
}
/** Configure the shared revocation store. Call once at startup (idempotent). */
export declare function configureRevocation(config: RevocationConfig): void;
/**
 * Thrown by verifyJwt when fail-closed: a shared revocation store IS configured but could
 * not be reached, so we cannot confirm the token is not revoked. Callers should map this to
 * a 503 (retryable) rather than a 401 — the token may be perfectly valid.
 */
export declare class RevocationCheckUnavailableError extends Error {
    readonly code = "REVOCATION_CHECK_UNAVAILABLE";
    constructor();
}
export declare function getJWKS(uri: string): ReturnType<typeof createRemoteJWKSet>;
/** Invalidate the JWKS cache for a URI (call when a 401 is received). */
export declare function invalidateJwks(uri: string): void;
/**
 * Mark a token as revoked. Writes to the per-process LRU (immediate on this node) and, when
 * a shared store is configured, to Redis (so EVERY node enforces it). Call this when
 * wrapper.user.session.revoked arrives. The local write is synchronous, so callers that do
 * not await still get immediate local effect; awaiting guarantees the shared write landed.
 */
export declare function revokeToken(jti: string): Promise<void>;
/** Verify a JWT and return the decoded payload. Throws on invalid/expired/revoked tokens. */
export declare function verifyJwt(token: string, config: JwtVerifyConfig): Promise<VerifiedToken>;
/** Extract a Bearer token from an Authorization header value. */
export declare function extractBearerToken(authHeader: string | undefined): string | null;
//# sourceMappingURL=local-jwt.d.ts.map