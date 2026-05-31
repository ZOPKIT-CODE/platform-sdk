import type { FastifyRequest, FastifyReply, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { verifyJwt, extractBearerToken, type JwtVerifyConfig, type WrapperTokenClaims } from './local-jwt';

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

function parseCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [key, val] = part.trim().split('=');
    if (key === name && val !== undefined) return decodeURIComponent(val);
  }
  return null;
}

const authPlugin: FastifyPluginCallback<AuthPluginOptions> = (fastify, options, done) => {
  const cookieName = options.cookieName ?? 'token';

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Prefer Authorization header; fall back to cookie
        const authHeader = request.headers.authorization;
        const cookieToken = parseCookie(request.headers.cookie ?? '', cookieName);
        const rawToken = extractBearerToken(authHeader) ?? cookieToken ?? null;

        if (!rawToken) {
          return reply.status(401).send({ message: 'Unauthorized — no token provided' });
        }

        const verified = await verifyJwt(rawToken, options);
        request.user = verified.payload;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unauthorized';
        return reply.status(401).send({ message });
      }
    },
  );

  done();
};

export const platformAuthPlugin = fp(authPlugin, {
  name: 'zopkit-platform-auth',
  fastify: '>=4',
});
