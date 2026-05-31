"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJWKS = getJWKS;
exports.invalidateJwks = invalidateJwks;
exports.revokeToken = revokeToken;
exports.verifyJwt = verifyJwt;
exports.extractBearerToken = extractBearerToken;
const jose_1 = require("jose");
const lru_cache_1 = require("lru-cache");
// jose's createRemoteJWKSet returns a function that is itself the cached key store.
// We cache one JWKS instance per URI so multiple callers share the same cache.
const jwksCache = new lru_cache_1.LRUCache({
    max: 10,
    ttl: 60 * 60 * 1000, // 1 hour — JWKS keys are stable; rotate on 401
});
/** Revoked token IDs. Populated from wrapper.user.session.revoked Platform Bus events. */
const revokedTokenIds = new lru_cache_1.LRUCache({
    max: 10000,
    ttl: 16 * 60 * 1000, // 16 minutes — slightly longer than the recommended 15-min token TTL
});
function getJWKS(uri) {
    let jwks = jwksCache.get(uri);
    if (!jwks) {
        jwks = (0, jose_1.createRemoteJWKSet)(new URL(uri));
        jwksCache.set(uri, jwks);
    }
    return jwks;
}
/** Invalidate the JWKS cache for a URI (call when a 401 is received). */
function invalidateJwks(uri) {
    jwksCache.delete(uri);
}
/** Mark a token as revoked. Call this when wrapper.user.session.revoked arrives. */
function revokeToken(jti) {
    revokedTokenIds.set(jti, true);
}
/** Verify a JWT and return the decoded payload. Throws on invalid/expired/revoked tokens. */
async function verifyJwt(token, config) {
    const jwks = getJWKS(config.jwksUri);
    const options = {};
    if (config.issuer)
        options.issuer = config.issuer;
    if (config.audience)
        options.audience = config.audience;
    const { payload } = await (0, jose_1.jwtVerify)(token, jwks, options);
    // Check revocation list (populated from Platform Bus events)
    if (payload.jti && revokedTokenIds.has(payload.jti)) {
        throw new Error('Token has been revoked');
    }
    return { payload: payload, raw: token };
}
/** Extract a Bearer token from an Authorization header value. */
function extractBearerToken(authHeader) {
    if (!authHeader)
        return null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}
//# sourceMappingURL=local-jwt.js.map