import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';

/**
 * Shared service-to-service token verification (HS256, shared secret).
 *
 * This is distinct from `platformAuthPlugin` (RS256 user tokens via JWKS).
 * Use this on internal endpoints called by other services (e.g. wrapper
 * → crm bootstrap, accounting → wrapper credit lookup) where a shared
 * symmetric secret is acceptable and avoids the JWKS round-trip.
 *
 * Registers:
 *   - `request.serviceContext` decorator (typed below)
 *   - a `preHandler` hook that verifies the Bearer token, checks the
 *     `type` and `service` claims, and attaches the context.
 *
 * Failure handling is configurable via `onFailure`:
 *   - `'reject'` (default): respond 401 with `{ error: 'unauthorized' }`.
 *     The verification failure reason is logged via `request.log.warn` so
 *     ops can debug without exposing internals over the wire.
 *   - `'continue'`: log the failure reason via `request.log.warn`, leave
 *     `request.serviceContext` unset (`undefined`), and return so the next
 *     `preHandler` in the chain runs. Useful for layered auth: try service
 *     token first, fall through to (e.g.) Kinde user-token verification.
 *
 *     ```ts
 *     // CRM-style layered auth: service token OR Kinde user token
 *     fastify.register(verifyServiceToken({
 *       allowedServices: ['wrapper'],
 *       jwtSecret: process.env.JWT_SECRET!,
 *       onFailure: 'continue',
 *     }));
 *     fastify.register(verifyKindeToken); // runs only if serviceContext is undefined
 *     ```
 *
 * ### Zero-downtime secret rotation
 *
 * Pass `additionalSecrets` to accept tokens signed with one or more
 * previous secrets during a rotation window. The verifier always tries
 * `jwtSecret` (the new/primary) first, then each entry in
 * `additionalSecrets` in order. The token is accepted as long as ANY
 * secret produces a valid signature; the 401 is only returned when ALL
 * configured secrets fail.
 *
 *     ```ts
 *     // During rotation: accept tokens signed with new OR old secret
 *     const previous = (process.env.JWT_SECRET_PREVIOUS ?? '')
 *       .split(',').map(s => s.trim()).filter(Boolean);
 *     fastify.register(verifyServiceToken({
 *       allowedServices: ['wrapper'],
 *       jwtSecret: process.env.JWT_SECRET!,
 *       additionalSecrets: previous.length ? previous : undefined,
 *     }));
 *     ```
 *
 * Rotation procedure (4 deploys, zero downtime):
 *   1. Generate new secret. Set `JWT_SECRET_PREVIOUS=<current>` on all
 *      services. Deploy. Verifiers now accept both.
 *   2. Set `JWT_SECRET=<new>` on the issuer (wrapper). Deploy. New tokens
 *      are signed with the new secret; in-flight tokens still verify
 *      against the previous secret.
 *   3. Set `JWT_SECRET=<new>` on every verifier. Deploy. Verifiers prefer
 *      the new secret but still accept the previous.
 *   4. After max-token-lifetime (e.g. 24h), remove `JWT_SECRET_PREVIOUS`
 *      from every service. Deploy. Rotation complete.
 */

declare module 'fastify' {
  interface FastifyRequest {
    serviceContext?: ServiceContext;
  }
}

export interface ServiceContext {
  tenantId: string;
  service: string;
  permissions: string[];
}

export interface ServiceTokenClaims {
  type: 'service_token';
  service: string;
  tenantId?: string;
  permissions?: string[];
  /** Standard JWT claims forwarded for diagnostics. */
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  sub?: string;
}

export interface VerifyServiceTokenOptions {
  /** Allow-list of `service` claim values that may call the protected routes. */
  allowedServices: string[];
  /** Shared HS256 secret. Must match the publisher of the token. */
  jwtSecret: string;
  /**
   * Additional secrets to try during a rotation window.
   * Verifier tries `jwtSecret` first, then each entry here in order.
   * After rotation completes, remove this option.
   */
  additionalSecrets?: string[];
  /** Optional expected issuer. Validated if provided. */
  issuer?: string;
  /** Optional expected audience. Validated if provided. */
  audience?: string;
  /**
   * Optional override of the route paths to protect. By default the plugin
   * registers a global `preHandler` and runs on every request handled by
   * the encapsulated context. Apply at register-time scope to limit reach.
   */
  routePathPredicate?: (request: FastifyRequest) => boolean;
  /**
   * How to handle verification failures:
   *   - `'reject'` (default): respond `401 { error: 'unauthorized' }` and
   *     end the request — the next `preHandler` does NOT run.
   *   - `'continue'`: log the failure via `request.log.warn`, leave
   *     `request.serviceContext` as `undefined`, and return so the next
   *     `preHandler` runs. Use this when you have a fallback auth scheme
   *     (e.g. user tokens) that should run when the service-token check
   *     doesn't apply.
   */
  onFailure?: 'reject' | 'continue';
}

const verifyServiceTokenPlugin: FastifyPluginAsync<VerifyServiceTokenOptions> =
  async (fastify, options) => {
    const {
      allowedServices,
      jwtSecret,
      additionalSecrets,
      issuer,
      audience,
      routePathPredicate,
      onFailure = 'reject',
    } = options;

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
    const candidateKeys: Uint8Array[] = [encoder.encode(jwtSecret)];
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
    const handleFailure = (
      reply: FastifyReply,
    ): Promise<void> | void => {
      if (onFailure === 'continue') {
        return; // fall through to next preHandler; serviceContext stays undefined
      }
      return reply.status(401).send({ error: 'unauthorized' }) as unknown as void;
    };

    fastify.addHook(
      'preHandler',
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (routePathPredicate && !routePathPredicate(request)) {
          return;
        }

        const authHeader = request.headers['authorization'];
        const token = extractBearer(authHeader);
        if (!token) {
          request.log.warn(
            { headerPresent: Boolean(authHeader) },
            'service-token: missing Authorization header',
          );
          return handleFailure(reply);
        }

        let claims: ServiceTokenClaims | undefined;
        let lastErr: unknown;
        for (let i = 0; i < candidateKeys.length; i++) {
          try {
            const { payload } = await jwtVerify(token, candidateKeys[i], {
              algorithms: ['HS256'],
              issuer,
              audience,
            });
            claims = payload as unknown as ServiceTokenClaims;
            break;
          } catch (err) {
            lastErr = err;
            // Try the next candidate. Note: jose surfaces signature, exp,
            // issuer, and audience failures all through the same exception
            // type, so we fall through and try the next secret. If the token
            // is genuinely expired, every secret will fail and the final
            // error is reported.
          }
        }
        if (!claims) {
          request.log.warn(
            {
              reason: lastErr instanceof Error ? lastErr.message : String(lastErr),
              keysTried: candidateKeys.length,
            },
            'service-token: jwt verification failed',
          );
          return handleFailure(reply);
        }

        if (claims.type !== 'service_token') {
          request.log.warn(
            { type: claims.type },
            'service-token: claim "type" is not "service_token"',
          );
          return handleFailure(reply);
        }

        if (!claims.service || !allowedSet.has(claims.service)) {
          request.log.warn(
            { service: claims.service },
            'service-token: service not in allowedServices',
          );
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
      },
    );
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
export function verifyServiceToken(
  opts: VerifyServiceTokenOptions,
): FastifyPluginAsync {
  // The options were captured at call time, so the returned plugin needs
  // no register-time opts. We type it as `FastifyPluginAsync` (no generic)
  // to keep `app.register(verifyServiceToken({...}))` clean for callers.
  const plugin: FastifyPluginAsync = async (fastify) => {
    await verifyServiceTokenPlugin(fastify, opts);
  };
  return fp(plugin, {
    name: 'zopkit-service-token-auth',
    fastify: '>=4',
  });
}

function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
