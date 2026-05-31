import { createRemoteJWKSet, type JWTPayload } from 'jose';
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
export declare function getJWKS(uri: string): ReturnType<typeof createRemoteJWKSet>;
/** Invalidate the JWKS cache for a URI (call when a 401 is received). */
export declare function invalidateJwks(uri: string): void;
/** Mark a token as revoked. Call this when wrapper.user.session.revoked arrives. */
export declare function revokeToken(jti: string): void;
/** Verify a JWT and return the decoded payload. Throws on invalid/expired/revoked tokens. */
export declare function verifyJwt(token: string, config: JwtVerifyConfig): Promise<VerifiedToken>;
/** Extract a Bearer token from an Authorization header value. */
export declare function extractBearerToken(authHeader: string | undefined): string | null;
//# sourceMappingURL=local-jwt.d.ts.map