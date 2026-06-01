import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyOptions } from 'jose';
import { LRUCache } from 'lru-cache';
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

// jose's createRemoteJWKSet returns a function that is itself the cached key store.
// We cache one JWKS instance per URI so multiple callers share the same cache.
const jwksCache = new LRUCache<string, ReturnType<typeof createRemoteJWKSet>>({
  max: 10,
  ttl: 60 * 60 * 1000, // 1 hour — JWKS keys are stable; rotate on 401
});

/**
 * Per-process revoked token IDs. Populated from wrapper.user.session.revoked Platform Bus
 * events on THIS node. This alone is NOT sufficient across multiple nodes — a token revoked
 * on node A is unknown to node B until B's own event arrives. The shared store below closes
 * that gap.
 */
const revokedTokenIds = new LRUCache<string, true>({
  max: 10_000,
  ttl: 16 * 60 * 1000, // 16 minutes — slightly longer than the recommended 15-min token TTL
});

/**
 * Optional SHARED revocation store (Redis/Valkey, via the MinimalRedisClient port). When
 * configured, revocations are written here so EVERY node enforces them immediately, and
 * verifyJwt consults it on every request. FAIL-CLOSED: if the store is configured but
 * unreachable during verification, the token is rejected (RevocationCheckUnavailableError)
 * rather than risk honouring a token that may have been revoked.
 */
let revocationRedis: MinimalRedisClient | null = null;
let revocationTtlSeconds = 16 * 60; // entry must outlive the access token; match the LRU
const REVOKE_KEY_PREFIX = 'revoked:jti:';

export interface RevocationConfig {
  /** Shared client (structurally a MinimalRedisClient). Pass null to disable sharing. */
  client: MinimalRedisClient | null;
  /** TTL for a revocation entry; should be >= the access-token lifetime. Default 16 min. */
  ttlSeconds?: number;
}

/** Configure the shared revocation store. Call once at startup (idempotent). */
export function configureRevocation(config: RevocationConfig): void {
  revocationRedis = config.client;
  if (config.ttlSeconds && config.ttlSeconds > 0) revocationTtlSeconds = config.ttlSeconds;
}

/**
 * Thrown by verifyJwt when fail-closed: a shared revocation store IS configured but could
 * not be reached, so we cannot confirm the token is not revoked. Callers should map this to
 * a 503 (retryable) rather than a 401 — the token may be perfectly valid.
 */
export class RevocationCheckUnavailableError extends Error {
  readonly code = 'REVOCATION_CHECK_UNAVAILABLE';
  constructor() {
    super('Token revocation check is unavailable');
    this.name = 'RevocationCheckUnavailableError';
  }
}

export function getJWKS(uri: string): ReturnType<typeof createRemoteJWKSet> {
  let jwks = jwksCache.get(uri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(uri));
    jwksCache.set(uri, jwks);
  }
  return jwks;
}

/** Invalidate the JWKS cache for a URI (call when a 401 is received). */
export function invalidateJwks(uri: string): void {
  jwksCache.delete(uri);
}

/**
 * Mark a token as revoked. Writes to the per-process LRU (immediate on this node) and, when
 * a shared store is configured, to Redis (so EVERY node enforces it). Call this when
 * wrapper.user.session.revoked arrives. The local write is synchronous, so callers that do
 * not await still get immediate local effect; awaiting guarantees the shared write landed.
 */
export async function revokeToken(jti: string): Promise<void> {
  revokedTokenIds.set(jti, true);
  if (revocationRedis) {
    await revocationRedis.set(REVOKE_KEY_PREFIX + jti, '1', 'EX', revocationTtlSeconds);
  }
}

/** Verify a JWT and return the decoded payload. Throws on invalid/expired/revoked tokens. */
export async function verifyJwt(
  token: string,
  config: JwtVerifyConfig,
): Promise<VerifiedToken> {
  const jwks = getJWKS(config.jwksUri);

  const options: JWTVerifyOptions = {};
  if (config.issuer) options.issuer = config.issuer;
  if (config.audience) options.audience = config.audience;

  const { payload } = await jwtVerify(token, jwks, options);

  // Revocation check. The per-process LRU is populated by Platform Bus events on THIS node;
  // the shared store (when configured) makes a revoke effective on EVERY node immediately.
  if (payload.jti) {
    if (revokedTokenIds.has(payload.jti)) {
      throw new Error('Token has been revoked');
    }
    if (revocationRedis) {
      let revoked: string | null;
      try {
        revoked = await revocationRedis.get(REVOKE_KEY_PREFIX + payload.jti);
      } catch {
        // FAIL-CLOSED: we cannot confirm the token is NOT revoked, so reject it.
        throw new RevocationCheckUnavailableError();
      }
      if (revoked != null) {
        // Cache the hit locally so repeat checks on this node are instant.
        revokedTokenIds.set(payload.jti, true);
        throw new Error('Token has been revoked');
      }
    }
  }

  return { payload: payload as VerifiedToken['payload'], raw: token };
}

/** Extract a Bearer token from an Authorization header value. */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
