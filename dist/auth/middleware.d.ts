import type { FastifyReply, FastifyPluginCallback } from 'fastify';
import { type JwtVerifyConfig, type WrapperTokenClaims } from './local-jwt';
/**
 * Fastify authentication plugin — works with Fastify 4 and Fastify 5 (ADR-008).
 *
 * Reads the JWT from the Authorization header or 'token' cookie,
 * verifies it locally using the Wrapper's JWKS endpoint, and populates
 * `request.user` with the decoded claims.
 *
 * Register once in app.ts:
 * ```ts
 * await app.register(authPlugin, {
 *   jwksUri: process.env.WRAPPER_JWKS_URI!,
 *   issuer: process.env.WRAPPER_JWT_ISSUER,
 * });
 * ```
 *
 * Then protect routes:
 * ```ts
 * fastify.addHook('onRequest', fastify.authenticate);
 * ```
 */
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
    interface FastifyRequest {
        user: WrapperTokenClaims;
    }
}
export interface AuthPluginOptions extends JwtVerifyConfig {
    /** Cookie name to read token from. Default 'token'. */
    cookieName?: string;
}
export declare const platformAuthPlugin: FastifyPluginCallback<AuthPluginOptions>;
//# sourceMappingURL=middleware.d.ts.map