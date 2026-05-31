"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformAuthPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const local_jwt_1 = require("./local-jwt");
function parseCookie(cookieHeader, name) {
    const parts = cookieHeader.split(';');
    for (const part of parts) {
        const [key, val] = part.trim().split('=');
        if (key === name && val !== undefined)
            return decodeURIComponent(val);
    }
    return null;
}
const authPlugin = (fastify, options, done) => {
    const cookieName = options.cookieName ?? 'token';
    fastify.decorate('authenticate', async (request, reply) => {
        try {
            // Prefer Authorization header; fall back to cookie
            const authHeader = request.headers.authorization;
            const cookieToken = parseCookie(request.headers.cookie ?? '', cookieName);
            const rawToken = (0, local_jwt_1.extractBearerToken)(authHeader) ?? cookieToken ?? null;
            if (!rawToken) {
                return reply.status(401).send({ message: 'Unauthorized — no token provided' });
            }
            const verified = await (0, local_jwt_1.verifyJwt)(rawToken, options);
            request.user = verified.payload;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unauthorized';
            return reply.status(401).send({ message });
        }
    });
    done();
};
exports.platformAuthPlugin = (0, fastify_plugin_1.default)(authPlugin, {
    name: 'zopkit-platform-auth',
    fastify: '>=4',
});
//# sourceMappingURL=middleware.js.map