import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyOptions } from 'jose';
import { LRUCache } from 'lru-cache';

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

/** Revoked token IDs. Populated from wrapper.user.session.revoked Platform Bus events. */
const revokedTokenIds = new LRUCache<string, true>({
  max: 10_000,
  ttl: 16 * 60 * 1000, // 16 minutes — slightly longer than the recommended 15-min token TTL
});

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

/** Mark a token as revoked. Call this when wrapper.user.session.revoked arrives. */
export function revokeToken(jti: string): void {
  revokedTokenIds.set(jti, true);
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

  // Check revocation list (populated from Platform Bus events)
  if (payload.jti && revokedTokenIds.has(payload.jti)) {
    throw new Error('Token has been revoked');
  }

  return { payload: payload as VerifiedToken['payload'], raw: token };
}

/** Extract a Bearer token from an Authorization header value. */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
