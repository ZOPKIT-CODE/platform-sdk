import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { verifyHs256WithRotation } from './service-token-middleware';

const enc = (s: string) => new TextEncoder().encode(s);
const PRIMARY = 'primary-secret-at-least-32-bytes-long-000';
const OLD = 'previous-secret-at-least-32-bytes-long-0';

function sign(secret: string, claims: Record<string, unknown> = {}, opts?: { iss?: string; aud?: string }) {
  let b = new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m');
  if (opts?.iss) b = b.setIssuer(opts.iss);
  if (opts?.aud) b = b.setAudience(opts.aud);
  return b.sign(enc(secret));
}

describe('verifyHs256WithRotation', () => {
  it('verifies a token signed with the primary secret', async () => {
    const p = await verifyHs256WithRotation(await sign(PRIMARY, { service: 'crm' }), { jwtSecret: PRIMARY });
    expect(p.service).toBe('crm');
  });

  it('verifies a token signed with a rotation fallback secret (zero-downtime rotation)', async () => {
    const p = await verifyHs256WithRotation(await sign(OLD, { service: 'crm' }), { jwtSecret: PRIMARY, additionalSecrets: [OLD] });
    expect(p.service).toBe('crm');
  });

  it('rejects a token that matches no configured secret', async () => {
    const rogue = 'rogue-secret-at-least-32-bytes-long-0000';
    await expect(verifyHs256WithRotation(await sign(rogue), { jwtSecret: PRIMARY, additionalSecrets: [OLD] })).rejects.toThrow();
  });

  it('filters empty/whitespace fallback secrets (the primary still verifies, no crash, no empty key smuggled)', async () => {
    const p = await verifyHs256WithRotation(await sign(PRIMARY, { service: 'crm' }), { jwtSecret: PRIMARY, additionalSecrets: ['', '   '] });
    expect(p.service).toBe('crm');
  });

  it('throws if jwtSecret is missing', async () => {
    await expect(verifyHs256WithRotation('x.y.z', { jwtSecret: '' })).rejects.toThrow(/jwtSecret is required/);
  });

  it('enforces issuer/audience when provided', async () => {
    const t = await sign(PRIMARY, {}, { iss: 'wrapper', aud: 'crm' });
    await expect(verifyHs256WithRotation(t, { jwtSecret: PRIMARY, issuer: 'someone-else' })).rejects.toThrow();
    const p = await verifyHs256WithRotation(t, { jwtSecret: PRIMARY, issuer: 'wrapper', audience: 'crm' });
    expect(p.iss).toBe('wrapper');
  });
});
