import { describe, it, expect, vi } from 'vitest';
import { createAuthorizer, matchPermission, permsVersion } from './authorizer';

const set = (...p: string[]) => new Set(p);

describe('matchPermission', () => {
  it('matches exact codes', () => {
    expect(matchPermission(set('accounting.invoices.create'), 'accounting.invoices.create')).toBe(true);
    expect(matchPermission(set('accounting.invoices.read'), 'accounting.invoices.create')).toBe(false);
  });

  it('honors wildcard grants at every level', () => {
    expect(matchPermission(set('*'), 'accounting.invoices.create')).toBe(true);
    expect(matchPermission(set('accounting.*'), 'accounting.invoices.create')).toBe(true);
    expect(matchPermission(set('accounting.invoices.*'), 'accounting.invoices.create')).toBe(true);
    expect(matchPermission(set('crm.*'), 'accounting.invoices.create')).toBe(false);
    expect(matchPermission(set('accounting.bills.*'), 'accounting.invoices.create')).toBe(false);
  });

  it('treats read and read_all as equivalent (both directions)', () => {
    expect(matchPermission(set('accounting.invoices.read_all'), 'accounting.invoices.read')).toBe(true);
    expect(matchPermission(set('accounting.invoices.read'), 'accounting.invoices.read_all')).toBe(true);
    expect(matchPermission(set('accounting.invoices.read'), 'accounting.bills.read')).toBe(false);
  });
});

describe('permsVersion', () => {
  it('is stable and order-independent', () => {
    const a = permsVersion(['b', 'a', 'c']);
    const b = permsVersion(['c', 'b', 'a', 'a']);
    expect(a).toBe(b);
    expect(a).toMatch(/^v1:[0-9a-f]{16}$/);
  });
  it('changes when the set changes', () => {
    expect(permsVersion(['a'])).not.toBe(permsVersion(['a', 'b']));
  });
});

describe('createAuthorizer.decide', () => {
  const baseClaims = { userId: 'u1', tenantId: 't1' };

  it('honors an embedded fat-token permission list (dual-read)', async () => {
    const loadGrants = vi.fn(async () => ({ permissions: [] as string[] }));
    const authz = createAuthorizer({ appId: 'accounting', loadGrants });

    const ok = await authz.decide({ ...baseClaims, permissions: ['accounting.invoices.create'] }, 'accounting.invoices.create');
    expect(ok.allowed).toBe(true);
    expect(ok.source).toBe('token');

    const no = await authz.decide({ ...baseClaims, permissions: ['accounting.invoices.read'] }, 'accounting.invoices.create');
    expect(no.allowed).toBe(false);
    expect(no.reason).toBe('missing:accounting.invoices.create');

    expect(loadGrants).not.toHaveBeenCalled(); // never resolves when the token carries perms
  });

  it('resolves server-side for a slim (permission-less) token', async () => {
    const loadGrants = vi.fn(async () => ({ permissions: ['accounting.customers.read'], roles: ['Org Admin'] }));
    const authz = createAuthorizer({ appId: 'accounting', loadGrants });

    const d = await authz.decide({ ...baseClaims, permissions: [] }, 'accounting.customers.read');
    expect(d.allowed).toBe(true);
    expect(d.roles).toEqual(['Org Admin']);
    expect(loadGrants).toHaveBeenCalledOnce();

    const deny = await authz.decide({ ...baseClaims }, 'accounting.vendors.delete');
    expect(deny.allowed).toBe(false);
  });

  it('caches resolution and re-resolves after invalidate', async () => {
    const loadGrants = vi.fn(async () => ({ permissions: ['accounting.customers.read'] }));
    const authz = createAuthorizer({ appId: 'accounting', loadGrants });

    await authz.decide(baseClaims, 'accounting.customers.read');
    await authz.decide(baseClaims, 'accounting.customers.read');
    expect(loadGrants).toHaveBeenCalledOnce(); // 2nd from cache

    await authz.invalidate('u1', 't1');
    await authz.decide(baseClaims, 'accounting.customers.read');
    expect(loadGrants).toHaveBeenCalledTimes(2); // re-resolved
  });

  it('deduplicates concurrent misses into one loadGrants call', async () => {
    let calls = 0;
    const loadGrants = vi.fn(async () => { calls++; await new Promise((r) => setTimeout(r, 10)); return { permissions: ['accounting.customers.read'] }; });
    const authz = createAuthorizer({ appId: 'accounting', loadGrants });

    await Promise.all([
      authz.decide(baseClaims, 'accounting.customers.read'),
      authz.decide(baseClaims, 'accounting.customers.read'),
      authz.decide(baseClaims, 'accounting.customers.read'),
    ]);
    expect(calls).toBe(1);
  });

  it('fails closed when resolution throws (default)', async () => {
    const loadGrants = vi.fn(async () => { throw new Error('db down'); });
    const authz = createAuthorizer({ appId: 'accounting', loadGrants, logger: { warn() {} } });
    const d = await authz.decide(baseClaims, 'accounting.customers.read');
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('resolve_error');
  });

  it('fails open only when explicitly configured', async () => {
    const loadGrants = vi.fn(async () => { throw new Error('db down'); });
    const authz = createAuthorizer({ appId: 'accounting', loadGrants, failMode: 'open', logger: { warn() {} } });
    const d = await authz.decide(baseClaims, 'accounting.customers.read');
    expect(d.allowed).toBe(true);
  });
});
