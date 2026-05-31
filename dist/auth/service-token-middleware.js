"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyServiceToken = verifyServiceToken;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jose_1 = require("jose");
const verifyServiceTokenPlugin = async (fastify, options) => {
    const { allowedServices, jwtSecret, additionalSecrets, issuer, audience, routePathPredicate, onFailure = 'reject', } = options;
    if (!jwtSecret || jwtSecret.length === 0) {
        throw new Error('verifyServiceToken: jwtSecret is required');
    }
    if (!allowedServices || allowedServices.length === 0) {
        throw new Error('verifyServiceToken: allowedServices must be non-empty');
    }
    // Build the ordered list of candidate keys: primary first, then any
    // rotation fallbacks. Empty / whitespace entries are filtered out so a
    // misconfigured `JWT_SECRET_PREVIOUS=,,` doesn't smuggle in an empty key.
    const encoder = new TextEncoder();
    const candidateKeys = [encoder.encode(jwtSecret)];
    if (additionalSecrets && additionalSecrets.length > 0) {
        for (const extra of additionalSecrets) {
            if (typeof extra === 'string' && extra.length > 0) {
                candidateKeys.push(encoder.encode(extra));
            }
        }
    }
    const allowedSet = new Set(allowedServices);
    if (!fastify.hasRequestDecorator('serviceContext')) {
        fastify.decorateRequest('serviceContext', undefined);
    }
    /**
     * On failure: either send 401 (reject mode) or return without setting
     * `serviceContext` (continue mode) so the next preHandler runs.
     * The caller has already emitted the appropriate `request.log.warn`.
     */
    const handleFailure = (reply) => {
        if (onFailure === 'continue') {
            return; // fall through to next preHandler; serviceContext stays undefined
        }
        return reply.status(401).send({ error: 'unauthorized' });
    };
    fastify.addHook('preHandler', async (request, reply) => {
        if (routePathPredicate && !routePathPredicate(request)) {
            return;
        }
        const authHeader = request.headers['authorization'];
        const token = extractBearer(authHeader);
        if (!token) {
            request.log.warn({ headerPresent: Boolean(authHeader) }, 'service-token: missing Authorization header');
            return handleFailure(reply);
        }
        let claims;
        let lastErr;
        for (let i = 0; i < candidateKeys.length; i++) {
            try {
                const { payload } = await (0, jose_1.jwtVerify)(token, candidateKeys[i], {
                    algorithms: ['HS256'],
                    issuer,
                    audience,
                });
                claims = payload;
                break;
            }
            catch (err) {
                lastErr = err;
                // Try the next candidate. Note: jose surfaces signature, exp,
                // issuer, and audience failures all through the same exception
                // type, so we fall through and try the next secret. If the token
                // is genuinely expired, every secret will fail and the final
                // error is reported.
            }
        }
        if (!claims) {
            request.log.warn({
                reason: lastErr instanceof Error ? lastErr.message : String(lastErr),
                keysTried: candidateKeys.length,
            }, 'service-token: jwt verification failed');
            return handleFailure(reply);
        }
        if (claims.type !== 'service_token') {
            request.log.warn({ type: claims.type }, 'service-token: claim "type" is not "service_token"');
            return handleFailure(reply);
        }
        if (!claims.service || !allowedSet.has(claims.service)) {
            request.log.warn({ service: claims.service }, 'service-token: service not in allowedServices');
            return handleFailure(reply);
        }
        if (!claims.tenantId) {
            request.log.warn('service-token: missing tenantId claim');
            return handleFailure(reply);
        }
        request.serviceContext = {
            tenantId: claims.tenantId,
            service: claims.service,
            permissions: claims.permissions ?? [],
        };
    });
};
/**
 * Returns a Fastify plugin that protects routes with shared-secret service
 * token verification. Register inside an encapsulated scope to limit the
 * protected surface area:
 *
 * ```ts
 * await app.register(async (scope) => {
 *   await scope.register(verifyServiceToken({
 *     allowedServices: ['crm', 'accounting'],
 *     jwtSecret: process.env.SERVICE_JWT_SECRET!,
 *   }));
 *   scope.get('/internal/credits', handler);
 * });
 * ```
 */
function verifyServiceToken(opts) {
    // The options were captured at call time, so the returned plugin needs
    // no register-time opts. We type it as `FastifyPluginAsync` (no generic)
    // to keep `app.register(verifyServiceToken({...}))` clean for callers.
    const plugin = async (fastify) => {
        await verifyServiceTokenPlugin(fastify, opts);
    };
    return (0, fastify_plugin_1.default)(plugin, {
        name: 'zopkit-service-token-auth',
        fastify: '>=4',
    });
}
function extractBearer(authHeader) {
    if (!authHeader)
        return null;
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
}
//# sourceMappingURL=service-token-middleware.js.map