/**
 * @zopkit/platform-sdk
 *
 * Main entry point. Safe to import from any Node.js context.
 *
 * IMPORTANT: Do NOT import temporal workflow definitions from here.
 * Workflow code must be imported via the isolated entry point:
 *   import { ... } from '@zopkit/platform-sdk/temporal/workflows'
 * Importing workflows via this file will break Temporal's determinism sandbox.
 */
export { APP_CODES, BusinessEventSchema, createEvent, } from './events/envelope';
export type { AppCode, BusinessEvent } from './events/envelope';
export { wouldCreateLoop, buildCausation } from './events/loop-guard';
export { parsePlatformBusMessage } from './events/parse.js';
export type { PlatformBusEnvelope } from './events/parse.js';
export { SnsPublisher } from './events/sns-publisher.js';
export type { SnsPublisherConfig, PublishResult, BusinessEventPublisher } from './events/sns-publisher.js';
export { validateEventPayload } from './events/publisher.js';
export { createSQSConsumer } from './events/consumer';
export type { SQSConsumerConfig, EventHandler } from './events/consumer';
export * from './events/schemas/platform-bus';
export * from './events/schemas/business-bus';
export { ALL_EVENT_SCHEMAS, getEventSchema } from './events/schemas/index';
export { EVENT_REGISTRY, EventEnvelope, SERVICE_NAMES, validateEvent, isKnownEventType, } from './events/registry';
export type { EventType, PayloadOf, ServiceName, ValidateEventResult, } from './events/registry';
export { parseSNSEnvelope, SNSEnvelopeParseError, } from './messaging/envelope';
export type { ParseSNSEnvelopeResult } from './messaging/envelope';
export { BaseSQSConsumer, PermanentEventError, } from './messaging/base-sqs-consumer';
export type { BaseSQSConsumerConfig, BaseConsumerLogger, ParsedEvent, HandlerResult, IdempotencyState, } from './messaging/base-sqs-consumer';
export { CircuitBreaker, CircuitBreakerOpenError, } from './resilience/circuit-breaker';
export type { CircuitBreakerOptions, CircuitState, } from './resilience/circuit-breaker';
export { verifyJwt, extractBearerToken, revokeToken, getJWKS, invalidateJwks, configureRevocation, RevocationCheckUnavailableError, } from './auth/local-jwt';
export type { JwtVerifyConfig, WrapperTokenClaims, VerifiedToken, RevocationConfig } from './auth/local-jwt';
export { platformAuthPlugin } from './auth/middleware';
export { verifyServiceToken, verifyHs256WithRotation } from './auth/service-token-middleware';
export type { ServiceContext, ServiceTokenClaims, VerifyServiceTokenOptions, VerifyHs256Options, } from './auth/service-token-middleware';
export { createAuthorizer, matchPermission, permsVersion } from './auth/authorizer';
export type { Authorizer, AuthorizerConfig, AuthClaims, AuthDecision, LoadedGrants, AuthorizerLogger, } from './auth/authorizer';
export { memoryCache, redisCache } from './auth/perm-cache';
export type { PermCache, CachedGrants, MinimalRedisClient } from './auth/perm-cache';
export { OUTBOX_SCHEMA_SQL } from './outbox/types';
export type { OutboxStore, OutboxRow, OutboxEnqueueInput } from './outbox/types';
export { createOutboxPoller } from './outbox/poller';
export type { OutboxPollerConfig } from './outbox/poller';
export { IDEMPOTENCY_SCHEMA_SQL, InMemoryIdempotencyStore } from './idempotency/tracker';
export type { IdempotencyStore } from './idempotency/tracker';
export { createTemporalClient, TASK_QUEUES } from './temporal/client';
export { ACTIVITY_OPTIONS, LOOKUP_RETRY, CRM_MUTATION_RETRY, FA_JOURNAL_RETRY, HRMS_RETRY, PM_RETRY, EXTERNAL_API_RETRY, NOTIFICATION_RETRY, } from './temporal/retry-policies';
export { createWorker, createOrchestrationWorker } from './temporal/worker';
export type { WorkerConfig } from './temporal/worker';
export type { ProvisioningSnapshot } from './temporal/workflows/tenant-provisioning';
//# sourceMappingURL=index.d.ts.map