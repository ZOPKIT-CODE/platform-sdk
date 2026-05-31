import { describe, it, expect } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { verifyServiceToken } from './service-token-middleware';

const JWT_SECRET = 'test-secret-please-do-not-use-in-prod-0123456789';
const secretKey = new TextEncoder().encode(JWT_SECRET);

interface TokenOpts {
  type?: string;
  service?: string;
  tenantId?: string;
  permissions?: string[];
  issuer?: string;
  audience?: string;
  expiresIn?: string;
  /** If true, sign with a different secret to simulate bad signature. */
  badSecret?: boolean;
  /** Omit exp entirely. */
  noExp?: boolean;
  /** Override expiration to be in the past. */
  expiredSeconds?: number;
}

async function makeToken(opts: TokenOpts = {}): Promise<string> {
  const {
    type = 'service_token',
    service = 'wrapper',
    tenantId = '00000000-0000-4000-8000-000000000001',
    permissions = ['read:everything'],
    issuer,
    audience,
    expiresIn = '5m',
    badSecret = false,
    noExp = false,
    expiredSeconds,
  } = opts;

  const builder = new SignJWT({
    type,
    service,
    tenantId,
    permissions,
  } as Record<string, unknown>).setProtectedHeader({ alg: 'HS256' }).setIssuedAt();

  if (!noExp) {
    if (expiredSeconds !== undefined) {
      builder.setExpirationTime(Math.floor(Date.now() / 1000) - expiredSeconds);
    } else {
      builder.setExpirationTime(expiresIn);
    }
  }
  if (issuer) builder.setIssuer(issuer);
  if (audience) builder.setAudience(audience);

  const key = badSecret
    ? new TextEncoder().encode('a-completely-different-secret-not-the-right-one-9999')
    : secretKey;
  return builder.sign(key);
}

async function buildApp(
  pluginOpts: Partial<{
    allowedServices: string[];
    onFailure: 'reject' | 'continue';
    issuer: string;
    audience: string;
  }> = {},
  extra?: (app: FastifyInstance) => Promise<void>,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(
    verifyServiceToken({
      allowedServices: pluginOpts.allowedServices ?? ['wrapper', 'crm'],
      jwtSecret: JWT_SECRET,
      issuer: pluginOpts.issuer,
      audience: pluginOpts.audience,
      onFailure: pluginOpts.onFailure,
    }),
  );

  if (extra) {
    await extra(app);
  }

  app.get('/protected', async (request) => {
    return {
      ok: true,
      serviceContext: request.serviceContext ?? null,
    };
  });

  await app.ready();
  return app;
}

describe('auth/service-token-middleware', () => {
  describe('default (onFailure=reject) behavior', () => {
    it('populates request.serviceContext for a valid token', async () => {
      const app = await buildApp();
      try {
        const token = await makeToken({ service: 'wrapper', tenantId: 'tenant-a' });
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.ok).toBe(true);
        expect(body.serviceContext).toMatchObject({
          tenantId: 'tenant-a',
          service: 'wrapper',
          permissions: ['read:everything'],
        });
      } finally {
        await app.close();
      }
    });

    it('returns 401 when signature is wrong', async () => {
      const app = await buildApp();
      try {
        const token = await makeToken({ badSecret: true });
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(401);
        expect(res.json()).toEqual({ error: 'unauthorized' });
      } finally {
        await app.close();
      }
    });

    it('returns 401 when type claim is not service_token', async () => {
      const app = await buildApp();
      try {
        const token = await makeToken({ type: 'access_token' });
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(401);
        expect(res.json()).toEqual({ error: 'unauthorized' });
      } finally {
        await app.close();
      }
    });

    it('returns 401 when service is not in allowedServices', async () => {
      const app = await buildApp({ allowedServices: ['wrapper'] });
      try {
        const token = await makeToken({ service: 'mystery-service' });
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });

    it('returns 401 when Authorization header is missing', async () => {
      const app = await buildApp();
      try {
        const res = await app.inject({ method: 'GET', url: '/protected' });
        expect(res.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });

    it('returns 401 when token is expired', async () => {
      const app = await buildApp();
      try {
        // exp set to 60s in the past
        const token = await makeToken({ expiredSeconds: 60 });
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });

    it('returns 401 when tenantId claim is missing', async () => {
      const app = await buildApp();
      try {
        // Build a token without tenantId
        const token = await new SignJWT({
          type: 'service_token',
          service: 'wrapper',
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(secretKey);

        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });

    it('rejects malformed Authorization header (no Bearer prefix)', async () => {
      const app = await buildApp();
      try {
        const token = await makeToken();
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: token }, // missing 'Bearer '
        });
        expect(res.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });
  });

  describe('onFailure=continue', () => {
    it('still populates serviceContext on a valid token (success path unchanged)', async () => {
      const app = await buildApp({ onFailure: 'continue' });
      try {
        const token = await makeToken({ service: 'wrapper', tenantId: 'tenant-b' });
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().serviceContext).toMatchObject({
          service: 'wrapper',
          tenantId: 'tenant-b',
        });
      } finally {
        await app.close();
      }
    });

    it('falls through (no 401) when signature is wrong, leaving serviceContext undefined', async () => {
      const app = await buildApp({ onFailure: 'continue' });
      try {
        const token = await makeToken({ badSecret: true });
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ ok: true, serviceContext: null });
      } finally {
        await app.close();
      }
    });

    it('falls through when Authorization header is missing', async () => {
      const app = await buildApp({ onFailure: 'continue' });
      try {
        const res = await app.inject({ method: 'GET', url: '/protected' });
        expect(res.statusCode).toBe(200);
        expect(res.json().serviceContext).toBeNull();
      } finally {
        await app.close();
      }
    });

    it('lets a subsequent preHandler run after a failure', async () => {
      // Mimic the CRM use case: service token plugin in continue mode,
      // then a fallback preHandler that approves the request and sets a marker.
      const app = Fastify({ logger: false });
      await app.register(
        verifyServiceToken({
          allowedServices: ['wrapper'],
          jwtSecret: JWT_SECRET,
          onFailure: 'continue',
        }),
      );

      app.addHook('preHandler', async (request) => {
        // pretend this is a Kinde user-token verifier; only runs because
        // serviceContext is undefined.
        (request as unknown as { fallbackAuth?: string }).fallbackAuth = 'kinde-user-123';
      });

      app.get('/protected', async (request) => ({
        ok: true,
        serviceContext: request.serviceContext ?? null,
        fallbackAuth:
          (request as unknown as { fallbackAuth?: string }).fallbackAuth ?? null,
      }));

      await app.ready();
      try {
        // No Authorization header → service token fails → continue → fallback runs
        const res = await app.inject({ method: 'GET', url: '/protected' });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({
          ok: true,
          serviceContext: null,
          fallbackAuth: 'kinde-user-123',
        });

        // Valid service token → fallback STILL runs (Fastify runs all
        // preHandlers), but serviceContext is populated, so the fallback
        // would normally skip itself. Here we just assert ordering works.
        const token = await makeToken({ service: 'wrapper', tenantId: 'tenant-c' });
        const res2 = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res2.statusCode).toBe(200);
        const body2 = res2.json();
        expect(body2.serviceContext).toMatchObject({
          service: 'wrapper',
          tenantId: 'tenant-c',
        });
      } finally {
        await app.close();
      }
    });
  });

  describe('additionalSecrets (rotation window)', () => {
    const SECRET_A = 'secret-A-primary-do-not-use-in-prod-aaaaaaaaaaaa';
    const SECRET_B = 'secret-B-previous-do-not-use-in-prod-bbbbbbbbbb';
    const SECRET_C = 'secret-C-bogus-not-in-rotation-cccccccccccccccc';

    async function makeTokenWithSecret(
      secret: string,
      overrides: { service?: string; tenantId?: string } = {},
    ): Promise<string> {
      const { service = 'wrapper', tenantId = 'tenant-x' } = overrides;
      return new SignJWT({
        type: 'service_token',
        service,
        tenantId,
        permissions: ['read:everything'],
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(new TextEncoder().encode(secret));
    }

    async function buildRotationApp(opts: {
      primary: string;
      additional?: string[];
      onFailure?: 'reject' | 'continue';
    }): Promise<FastifyInstance> {
      const app = Fastify({ logger: false });
      await app.register(
        verifyServiceToken({
          allowedServices: ['wrapper'],
          jwtSecret: opts.primary,
          additionalSecrets: opts.additional,
          onFailure: opts.onFailure,
        }),
      );
      app.get('/protected', async (request) => ({
        ok: true,
        serviceContext: request.serviceContext ?? null,
      }));
      await app.ready();
      return app;
    }

    it('accepts a token signed with a previous secret listed in additionalSecrets', async () => {
      // Token signed with B, verifier configured primary=A, additional=[B] -> 200
      const app = await buildRotationApp({
        primary: SECRET_A,
        additional: [SECRET_B],
      });
      try {
        const token = await makeTokenWithSecret(SECRET_B, { tenantId: 'tenant-rot' });
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().serviceContext).toMatchObject({
          service: 'wrapper',
          tenantId: 'tenant-rot',
        });
      } finally {
        await app.close();
      }
    });

    it('still accepts a token signed with the primary secret', async () => {
      const app = await buildRotationApp({
        primary: SECRET_A,
        additional: [SECRET_B],
      });
      try {
        const token = await makeTokenWithSecret(SECRET_A);
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
      } finally {
        await app.close();
      }
    });

    it('returns 401 when token is signed with a secret not in primary or additionalSecrets', async () => {
      const app = await buildRotationApp({
        primary: SECRET_A,
        additional: [SECRET_B],
      });
      try {
        const token = await makeTokenWithSecret(SECRET_C);
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(401);
        expect(res.json()).toEqual({ error: 'unauthorized' });
      } finally {
        await app.close();
      }
    });

    it('falls through (no 401) on unknown secret when onFailure=continue', async () => {
      const app = await buildRotationApp({
        primary: SECRET_A,
        additional: [SECRET_B],
        onFailure: 'continue',
      });
      try {
        const token = await makeTokenWithSecret(SECRET_C);
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().serviceContext).toBeNull();
      } finally {
        await app.close();
      }
    });

    it('tries multiple additionalSecrets in order until one matches', async () => {
      // Token signed with the last entry of additionalSecrets
      const app = await buildRotationApp({
        primary: SECRET_A,
        additional: [SECRET_C, SECRET_B], // B is last in the list
      });
      try {
        const token = await makeTokenWithSecret(SECRET_B);
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
      } finally {
        await app.close();
      }
    });

    it('ignores empty / whitespace entries in additionalSecrets (defensive)', async () => {
      // A misconfigured JWT_SECRET_PREVIOUS="" should not accept everything.
      const app = await buildRotationApp({
        primary: SECRET_A,
        additional: ['', SECRET_B, ''],
      });
      try {
        // valid (signed with B) -> 200
        const okToken = await makeTokenWithSecret(SECRET_B);
        const okRes = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${okToken}` },
        });
        expect(okRes.statusCode).toBe(200);

        // bogus (signed with C) -> 401
        const badToken = await makeTokenWithSecret(SECRET_C);
        const badRes = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${badToken}` },
        });
        expect(badRes.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });
  });

  describe('config validation', () => {
    it('throws when jwtSecret is missing', async () => {
      const app = Fastify({ logger: false });
      await expect(
        app.register(
          verifyServiceToken({
            allowedServices: ['wrapper'],
            jwtSecret: '',
          }),
        ),
      ).rejects.toThrow(/jwtSecret is required/);
      await app.close();
    });

    it('throws when allowedServices is empty', async () => {
      const app = Fastify({ logger: false });
      await expect(
        app.register(
          verifyServiceToken({
            allowedServices: [],
            jwtSecret: JWT_SECRET,
          }),
        ),
      ).rejects.toThrow(/allowedServices must be non-empty/);
      await app.close();
    });
  });
});
