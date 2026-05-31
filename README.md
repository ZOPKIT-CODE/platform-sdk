# @zopkit/platform-sdk

Shared integration SDK for the Zopkit Business Suite — the framework-agnostic core
that every app builds on: **event bus**, **authorization**, **outbox**, **Temporal**,
**idempotency**, and **resilience** helpers.

It deliberately has **no web-framework dependency** (apps run a mix of Fastify 4 and
Fastify 5), so each capability is a plain function/class an app wraps in a thin seam.

## What's in here

| Area | Entry points |
|------|--------------|
| **Authorization** | `createAuthorizer`, `matchPermission`, `permsVersion`, `memoryCache`, `redisCache` |
| Auth (JWT/service) | `verifyJwt`, `invalidateJwks`, `revokeToken`, `verifyServiceToken` |
| Events / messaging | `createEvent`, `isKnownEventType`, `EventBridgePublisher`, `createOutboxPoller` |
| Temporal | `createTemporalClient`, `createWorker`, `createOrchestrationWorker`, `TASK_QUEUES` |
| Resilience | `CircuitBreaker` |

### Authorization core (RBAC, server-side)

`createAuthorizer({ appId, loadGrants, cache, failMode })` resolves a user's permission
grants **server-side** (cache → app-provided `loadGrants`) instead of trusting a permission
list in the token — so tokens stay tiny (no 431) and permission changes take effect within
the cache TTL / on invalidation rather than at token expiry.

- `cache`: `memoryCache()` (single-node/dev) or `redisCache(client)` (multi-node). The Redis
  adapter is typed against a minimal structural client (`MinimalRedisClient`) that both
  `ioredis` and `node-redis` satisfy — **the SDK has no Redis dependency**.
- Cache keys are `perms:{appId}:{tenant}:{user}`, so multiple apps can share one Redis/Valkey
  instance without collisions.
- Consumers: `finance-accounting` (Fastify 4) and `b2b-crm` (Fastify 5) both use this core via
  their own `loadGrants` adapter over their synced wrapper-role tables.

## How apps consume this package

Apps depend on it by **relative path**:

```jsonc
// <app>/server/package.json
"@zopkit/platform-sdk": "file:../../packages/platform-sdk"
```

The package layout assumes the apps and this repo are checked out as siblings:

```
…/packages/platform-sdk     ← this repo
…/finance-accounting
…/b2b-crm
```

`dist/` is **committed** because the apps snapshot this package at install time and do not
build it themselves (see `.gitignore`).

## Releasing a change

1. Edit `src/`.
2. `pnpm build` (regenerates `dist/`).
3. **Bump `version`** in `package.json`. This matters: pnpm `file:` consumers key their snapshot
   off the manifest, not the dist contents — without a version bump, `pnpm update
   @zopkit/platform-sdk` in the app will NOT pick up new `dist/`. (npm consumers like b2b-crm use
   a live symlink and see changes immediately.)
4. Commit `src/` + `dist/` + the version bump together.
5. In each pnpm consumer: `pnpm update @zopkit/platform-sdk` to refresh its snapshot.

## Scripts

```
pnpm build       # tsc -p tsconfig.build.json → dist/
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run
```
