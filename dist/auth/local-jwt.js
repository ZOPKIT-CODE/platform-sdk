"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevocationCheckUnavailableError = void 0;
exports.configureRevocation = configureRevocation;
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
/**
 * Per-process revoked token IDs. Populated from wrapper.user.session.revoked Platform Bus
 * events on THIS node. This alone is NOT sufficient across multiple nodes — a token revoked
 * on node A is unknown to node B until B's own event arrives. The shared store below closes
 * that gap.
 */
const revokedTokenIds = new lru_cache_1.LRUCache({
    max: 10000,
    ttl: 16 * 60 * 1000, // 16 minutes — slightly longer than the recommended 15-min token TTL
});
/**
 * Optional SHARED revocation store (Redis/Valkey, via the MinimalRedisClient port). When
 * configured, revocations are written here so EVERY node enforces them immediately, and
 * verifyJwt consults it on every request. FAIL-CLOSED: if the store is configured but
 * unreachable during verification, the token is rejected (RevocationCheckUnavailableError)
 * rather than risk honouring a token that may have been revoked.
 */
let revocationRedis = null;
let revocationTtlSeconds = 16 * 60; // entry must outlive the access token; match the LRU
const REVOKE_KEY_PREFIX = 'revoked:jti:';
/** Configure the shared revocation store. Call once at startup (idempotent). */
function configureRevocation(config) {
    revocationRedis = config.client;
    if (config.ttlSeconds && config.ttlSeconds > 0)
        revocationTtlSeconds = config.ttlSeconds;
}
/**
 * Thrown by verifyJwt when fail-closed: a shared revocation store IS configured but could
 * not be reached, so we cannot confirm the token is not revoked. Callers should map this to
 * a 503 (retryable) rather than a 401 — the token may be perfectly valid.
 */
class RevocationCheckUnavailableError extends Error {
    constructor() {
        super('Token revocation check is unavailable');
        this.code = 'REVOCATION_CHECK_UNAVAILABLE';
        this.name = 'RevocationCheckUnavailableError';
    }
}
exports.RevocationCheckUnavailableError = RevocationCheckUnavailableError;
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
/**
 * Mark a token as revoked. Writes to the per-process LRU (immediate on this node) and, when
 * a shared store is configured, to Redis (so EVERY node enforces it). Call this when
 * wrapper.user.session.revoked arrives. The local write is synchronous, so callers that do
 * not await still get immediate local effect; awaiting guarantees the shared write landed.
 */
async function revokeToken(jti) {
    revokedTokenIds.set(jti, true);
    if (revocationRedis) {
        await revocationRedis.set(REVOKE_KEY_PREFIX + jti, '1', 'EX', revocationTtlSeconds);
    }
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
    // Revocation check. The per-process LRU is populated by Platform Bus events on THIS node;
    // the shared store (when configured) makes a revoke effective on EVERY node immediately.
    if (payload.jti) {
        if (revokedTokenIds.has(payload.jti)) {
            throw new Error('Token has been revoked');
        }
        if (revocationRedis) {
            let revoked;
            try {
                revoked = await revocationRedis.get(REVOKE_KEY_PREFIX + payload.jti);
            }
            catch {
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