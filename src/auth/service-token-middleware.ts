import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify, type JWTPayload } from 'jose';

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

export interface VerifyHs256Options {
  /** Primary HS256 secret, tried first. */
  jwtSecret: string;
  /** Rotation fallbacks tried in order after the primary (newest first). */
  additionalSecrets?: string[];
  /** Optional expected issuer. Validated if provided. */
  issuer?: string;
  /** Optional expected audience. Validated if provided. */
  audience?: string;
}

/** Build the ordered candidate-key list; empty/whitespace secrets are filtered out. */
function buildCandidateKeys(jwtSecret: string, additionalSecrets?: string[]): Uint8Array[] {
  const encoder = new TextEncoder();
  const keys: Uint8Array[] = [encoder.encode(jwtSecret)];
  for (const extra of additionalSecrets ?? []) {
    if (typeof extra === 'string' && extra.length > 0) keys.push(encoder.encode(extra));
  }
  return keys;
}

/** Try each candidate key in order; return the first valid payload or throw the last error. */
async function verifyWithKeys(
  token: string,
  candidateKeys: Uint8Array[],
  issuer?: string,
  audience?: string,
): Promise<JWTPayload> {
  let lastErr: unknown;
  for (const key of candidateKeys) {
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer, audience });
      return payload;
    } catch (err) {
      // jose surfaces signature/exp/issuer/audience failures through one exception
      // type, so fall through to the next secret; the final error is reported.
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('jwt verification failed');
}

/**
 * Verify an HS256 JWT against a primary secret + optional rotation fallbacks (zero-downtime
 * secret rotation). This is the SAME rotation-verify logic the verifyServiceToken plugin
 * uses, exported so apps that verify service tokens INLINE (not via the plugin) share one
 * tested implementation instead of hand-rolling the candidate-key loop. Returns the payload
 * or throws the last verification error.
 */
export async function verifyHs256WithRotation(token: string, opts: VerifyHs256Options): Promise<JWTPayload> {
  if (!opts.jwtSecret || opts.jwtSecret.length === 0) {
    throw new Error('verifyHs256WithRotation: jwtSecret is required');
  }
  return verifyWithKeys(token, buildCandidateKeys(opts.jwtSecret, opts.additionalSecrets), opts.issuer, opts.audience);
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

    // Primary key first, then rotation fallbacks (empty entries filtered).
    const candidateKeys = buildCandidateKeys(jwtSecret, additionalSecrets);
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

        let claims: ServiceTokenClaims;
        try {
          claims = (await verifyWithKeys(token, candidateKeys, issuer, audience)) as unknown as ServiceTokenClaims;
        } catch (err) {
          request.log.warn(
            {
              reason: err instanceof Error ? err.message : String(err),
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
