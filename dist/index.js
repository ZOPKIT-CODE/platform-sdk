"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTERNAL_API_RETRY = exports.PM_RETRY = exports.HRMS_RETRY = exports.FA_JOURNAL_RETRY = exports.CRM_MUTATION_RETRY = exports.LOOKUP_RETRY = exports.ACTIVITY_OPTIONS = exports.TASK_QUEUES = exports.createTemporalClient = exports.InMemoryIdempotencyStore = exports.IDEMPOTENCY_SCHEMA_SQL = exports.createOutboxPoller = exports.OUTBOX_SCHEMA_SQL = exports.redisCache = exports.memoryCache = exports.permsVersion = exports.matchPermission = exports.createAuthorizer = exports.verifyHs256WithRotation = exports.verifyServiceToken = exports.platformAuthPlugin = exports.RevocationCheckUnavailableError = exports.configureRevocation = exports.invalidateJwks = exports.getJWKS = exports.revokeToken = exports.extractBearerToken = exports.verifyJwt = exports.CircuitBreakerOpenError = exports.CircuitBreaker = exports.PermanentEventError = exports.BaseSQSConsumer = exports.SNSEnvelopeParseError = exports.parseSNSEnvelope = exports.isKnownEventType = exports.validateEvent = exports.SERVICE_NAMES = exports.EventEnvelope = exports.EVENT_REGISTRY = exports.getEventSchema = exports.ALL_EVENT_SCHEMAS = exports.createSQSConsumer = exports.validateEventPayload = exports.SnsPublisher = exports.parsePlatformBusMessage = exports.buildCausation = exports.wouldCreateLoop = exports.createEvent = exports.BusinessEventSchema = exports.APP_CODES = void 0;
exports.createOrchestrationWorker = exports.createWorker = exports.NOTIFICATION_RETRY = void 0;
// ─── Events ────────────────────────────────────────────────────────────────
var envelope_1 = require("./events/envelope");
Object.defineProperty(exports, "APP_CODES", { enumerable: true, get: function () { return envelope_1.APP_CODES; } });
Object.defineProperty(exports, "BusinessEventSchema", { enumerable: true, get: function () { return envelope_1.BusinessEventSchema; } });
Object.defineProperty(exports, "createEvent", { enumerable: true, get: function () { return envelope_1.createEvent; } });
var loop_guard_1 = require("./events/loop-guard");
Object.defineProperty(exports, "wouldCreateLoop", { enumerable: true, get: function () { return loop_guard_1.wouldCreateLoop; } });
Object.defineProperty(exports, "buildCausation", { enumerable: true, get: function () { return loop_guard_1.buildCausation; } });
var parse_js_1 = require("./events/parse.js");
Object.defineProperty(exports, "parsePlatformBusMessage", { enumerable: true, get: function () { return parse_js_1.parsePlatformBusMessage; } });
var sns_publisher_js_1 = require("./events/sns-publisher.js");
Object.defineProperty(exports, "SnsPublisher", { enumerable: true, get: function () { return sns_publisher_js_1.SnsPublisher; } });
var publisher_js_1 = require("./events/publisher.js");
Object.defineProperty(exports, "validateEventPayload", { enumerable: true, get: function () { return publisher_js_1.validateEventPayload; } });
var consumer_1 = require("./events/consumer");
Object.defineProperty(exports, "createSQSConsumer", { enumerable: true, get: function () { return consumer_1.createSQSConsumer; } });
// ─── Event Schemas ─────────────────────────────────────────────────────────
// Zod schemas and inferred types share the same export name (z.infer pattern).
// Import as a value to get the Zod schema; import as a type to get the TS type.
__exportStar(require("./events/schemas/platform-bus"), exports);
__exportStar(require("./events/schemas/business-bus"), exports);
var index_1 = require("./events/schemas/index");
Object.defineProperty(exports, "ALL_EVENT_SCHEMAS", { enumerable: true, get: function () { return index_1.ALL_EVENT_SCHEMAS; } });
Object.defineProperty(exports, "getEventSchema", { enumerable: true, get: function () { return index_1.getEventSchema; } });
// ─── Event Registry (cross-app canonical event types) ──────────────────────
var registry_1 = require("./events/registry");
Object.defineProperty(exports, "EVENT_REGISTRY", { enumerable: true, get: function () { return registry_1.EVENT_REGISTRY; } });
Object.defineProperty(exports, "EventEnvelope", { enumerable: true, get: function () { return registry_1.EventEnvelope; } });
Object.defineProperty(exports, "SERVICE_NAMES", { enumerable: true, get: function () { return registry_1.SERVICE_NAMES; } });
Object.defineProperty(exports, "validateEvent", { enumerable: true, get: function () { return registry_1.validateEvent; } });
Object.defineProperty(exports, "isKnownEventType", { enumerable: true, get: function () { return registry_1.isKnownEventType; } });
// ─── Messaging (SNS envelope parsing) ──────────────────────────────────────
var envelope_2 = require("./messaging/envelope");
Object.defineProperty(exports, "parseSNSEnvelope", { enumerable: true, get: function () { return envelope_2.parseSNSEnvelope; } });
Object.defineProperty(exports, "SNSEnvelopeParseError", { enumerable: true, get: function () { return envelope_2.SNSEnvelopeParseError; } });
// ─── Messaging (BaseSQSConsumer — shared poll/dispatch orchestration) ──────
var base_sqs_consumer_1 = require("./messaging/base-sqs-consumer");
Object.defineProperty(exports, "BaseSQSConsumer", { enumerable: true, get: function () { return base_sqs_consumer_1.BaseSQSConsumer; } });
Object.defineProperty(exports, "PermanentEventError", { enumerable: true, get: function () { return base_sqs_consumer_1.PermanentEventError; } });
// ─── Resilience ────────────────────────────────────────────────────────────
var circuit_breaker_1 = require("./resilience/circuit-breaker");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return circuit_breaker_1.CircuitBreaker; } });
Object.defineProperty(exports, "CircuitBreakerOpenError", { enumerable: true, get: function () { return circuit_breaker_1.CircuitBreakerOpenError; } });
// ─── Auth ──────────────────────────────────────────────────────────────────
var local_jwt_1 = require("./auth/local-jwt");
Object.defineProperty(exports, "verifyJwt", { enumerable: true, get: function () { return local_jwt_1.verifyJwt; } });
Object.defineProperty(exports, "extractBearerToken", { enumerable: true, get: function () { return local_jwt_1.extractBearerToken; } });
Object.defineProperty(exports, "revokeToken", { enumerable: true, get: function () { return local_jwt_1.revokeToken; } });
Object.defineProperty(exports, "getJWKS", { enumerable: true, get: function () { return local_jwt_1.getJWKS; } });
Object.defineProperty(exports, "invalidateJwks", { enumerable: true, get: function () { return local_jwt_1.invalidateJwks; } });
Object.defineProperty(exports, "configureRevocation", { enumerable: true, get: function () { return local_jwt_1.configureRevocation; } });
Object.defineProperty(exports, "RevocationCheckUnavailableError", { enumerable: true, get: function () { return local_jwt_1.RevocationCheckUnavailableError; } });
var middleware_1 = require("./auth/middleware");
Object.defineProperty(exports, "platformAuthPlugin", { enumerable: true, get: function () { return middleware_1.platformAuthPlugin; } });
var service_token_middleware_1 = require("./auth/service-token-middleware");
Object.defineProperty(exports, "verifyServiceToken", { enumerable: true, get: function () { return service_token_middleware_1.verifyServiceToken; } });
Object.defineProperty(exports, "verifyHs256WithRotation", { enumerable: true, get: function () { return service_token_middleware_1.verifyHs256WithRotation; } });
// ─── Authorization (framework-agnostic core; resolve permissions server-side) ──
var authorizer_1 = require("./auth/authorizer");
Object.defineProperty(exports, "createAuthorizer", { enumerable: true, get: function () { return authorizer_1.createAuthorizer; } });
Object.defineProperty(exports, "matchPermission", { enumerable: true, get: function () { return authorizer_1.matchPermission; } });
Object.defineProperty(exports, "permsVersion", { enumerable: true, get: function () { return authorizer_1.permsVersion; } });
var perm_cache_1 = require("./auth/perm-cache");
Object.defineProperty(exports, "memoryCache", { enumerable: true, get: function () { return perm_cache_1.memoryCache; } });
Object.defineProperty(exports, "redisCache", { enumerable: true, get: function () { return perm_cache_1.redisCache; } });
// ─── Outbox ────────────────────────────────────────────────────────────────
var types_1 = require("./outbox/types");
Object.defineProperty(exports, "OUTBOX_SCHEMA_SQL", { enumerable: true, get: function () { return types_1.OUTBOX_SCHEMA_SQL; } });
var poller_1 = require("./outbox/poller");
Object.defineProperty(exports, "createOutboxPoller", { enumerable: true, get: function () { return poller_1.createOutboxPoller; } });
// ─── Idempotency ───────────────────────────────────────────────────────────
var tracker_1 = require("./idempotency/tracker");
Object.defineProperty(exports, "IDEMPOTENCY_SCHEMA_SQL", { enumerable: true, get: function () { return tracker_1.IDEMPOTENCY_SCHEMA_SQL; } });
Object.defineProperty(exports, "InMemoryIdempotencyStore", { enumerable: true, get: function () { return tracker_1.InMemoryIdempotencyStore; } });
// ─── Temporal (infrastructure only — NOT workflow definitions) ─────────────
var client_1 = require("./temporal/client");
Object.defineProperty(exports, "createTemporalClient", { enumerable: true, get: function () { return client_1.createTemporalClient; } });
Object.defineProperty(exports, "TASK_QUEUES", { enumerable: true, get: function () { return client_1.TASK_QUEUES; } });
var retry_policies_1 = require("./temporal/retry-policies");
Object.defineProperty(exports, "ACTIVITY_OPTIONS", { enumerable: true, get: function () { return retry_policies_1.ACTIVITY_OPTIONS; } });
Object.defineProperty(exports, "LOOKUP_RETRY", { enumerable: true, get: function () { return retry_policies_1.LOOKUP_RETRY; } });
Object.defineProperty(exports, "CRM_MUTATION_RETRY", { enumerable: true, get: function () { return retry_policies_1.CRM_MUTATION_RETRY; } });
Object.defineProperty(exports, "FA_JOURNAL_RETRY", { enumerable: true, get: function () { return retry_policies_1.FA_JOURNAL_RETRY; } });
Object.defineProperty(exports, "HRMS_RETRY", { enumerable: true, get: function () { return retry_policies_1.HRMS_RETRY; } });
Object.defineProperty(exports, "PM_RETRY", { enumerable: true, get: function () { return retry_policies_1.PM_RETRY; } });
Object.defineProperty(exports, "EXTERNAL_API_RETRY", { enumerable: true, get: function () { return retry_policies_1.EXTERNAL_API_RETRY; } });
Object.defineProperty(exports, "NOTIFICATION_RETRY", { enumerable: true, get: function () { return retry_policies_1.NOTIFICATION_RETRY; } });
var worker_1 = require("./temporal/worker");
Object.defineProperty(exports, "createWorker", { enumerable: true, get: function () { return worker_1.createWorker; } });
Object.defineProperty(exports, "createOrchestrationWorker", { enumerable: true, get: function () { return worker_1.createOrchestrationWorker; } });
//# sourceMappingURL=index.js.map