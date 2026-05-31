"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_REGISTRY = exports.AccountingEntityProvisionRequestedPayload = exports.ConfigurationUpdatedPayload = exports.TenantApplicationsUpdatedPayload = exports.TenantAppDeprovisionedPayload = exports.TenantAppProvisionedPayload = exports.TenantDeletedPayload = exports.TenantBootstrappedPayload = exports.TenantOnboardedPayload = exports.SubscriptionRenewedPayload = exports.SubscriptionExpiredPayload = exports.SubscriptionUpgradedPayload = exports.SubscriptionCanceledPayload = exports.SubscriptionCancelScheduledPayload = exports.CreditConfigUpdatedPayload = exports.CreditExpiredPayload = exports.CreditRevokedPayload = exports.CreditConsumedPayload = exports.CreditAllocatedPayload = exports.RoleUnassignedPayload = exports.RoleAssignedPayload = exports.RoleDeletedPayload = exports.RoleUpdatedPayload = exports.RoleCreatedPayload = exports.OrganizationUnassignedPayload = exports.OrganizationAssignedPayload = exports.OrganizationAssignmentRemovedPayload = exports.OrganizationAssignmentPayload = exports.OrganizationDeactivatedPayload = exports.OrganizationDeletedPayload = exports.OrganizationUpdatedPayload = exports.OrganizationCreatedPayload = exports.EntityDeactivatedPayload = exports.EntityDeletedPayload = exports.EntityUpdatedPayload = exports.EntityCreatedPayload = exports.UserSessionRevokedPayload = exports.UserInvitationAcceptedPayload = exports.UserDeletedPayload = exports.UserDeactivatedPayload = exports.UserUpdatedPayload = exports.UserCreatedPayload = exports.EventEnvelope = exports.SERVICE_NAMES = void 0;
exports.isKnownEventType = isKnownEventType;
exports.validateEvent = validateEvent;
const zod_1 = require("zod");
/**
 * Canonical event registry for the Zopkit cross-app event bus.
 *
 * This file centralises the 25+ event types that flow between
 * wrapper, crm, accounting (FA), and ops. Today each app defines
 * these ad-hoc; consolidating here gives us one source of truth
 * for envelope + payload validation.
 *
 * Two layers:
 *   1. `EventEnvelope` — the cross-app message wrapper (snake_case,
 *      matches the on-the-wire JSON used in production today).
 *   2. `EVENT_REGISTRY` — per-event-type Zod schemas for the
 *      `payload` field.
 *
 * Notes:
 *   - Payloads are intentionally minimal — only the obvious fields
 *     (ids, names, timestamps, statuses). Extra/unknown fields are
 *     not stripped by default (`.passthrough()`) so consumers can
 *     opt into stricter validation app-side.
 *   - The eventType strings here use the canonical bare form
 *     ('user.created', not 'wrapper.user.created'). The shared
 *     `parseSNSEnvelope` normaliser handles inbound prefix stripping.
 */
// ──────────────────────────────────────────────────────────────────────────
// Envelope
// ──────────────────────────────────────────────────────────────────────────
exports.SERVICE_NAMES = ['wrapper', 'crm', 'accounting', 'ops'];
exports.EventEnvelope = zod_1.z.object({
    event_id: zod_1.z.string().uuid(),
    event_type: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    source_service: zod_1.z.enum(exports.SERVICE_NAMES),
    target_service: zod_1.z.enum(exports.SERVICE_NAMES).optional(),
    tenant_id: zod_1.z.string().uuid(),
    payload: zod_1.z.unknown(),
    version: zod_1.z.number().int().default(1),
});
// ──────────────────────────────────────────────────────────────────────────
// Shared building blocks
// ──────────────────────────────────────────────────────────────────────────
const isoDateTime = zod_1.z.string().datetime();
const uuid = zod_1.z.string().uuid();
const flexibleId = zod_1.z.string().min(1); // some legacy ids are not UUIDs
// ──────────────────────────────────────────────────────────────────────────
// User events
// ──────────────────────────────────────────────────────────────────────────
exports.UserCreatedPayload = zod_1.z
    .object({
    userId: flexibleId,
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().default(true),
    kindeUserId: zod_1.z.string().optional(),
    createdAt: isoDateTime.optional(),
})
    .passthrough();
exports.UserUpdatedPayload = zod_1.z
    .object({
    userId: flexibleId,
    email: zod_1.z.string().email().optional(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    updatedAt: isoDateTime.optional(),
})
    .passthrough();
exports.UserDeactivatedPayload = zod_1.z
    .object({
    userId: flexibleId,
    deactivatedAt: isoDateTime,
    reason: zod_1.z.string().optional(),
})
    .passthrough();
exports.UserDeletedPayload = zod_1.z
    .object({
    userId: flexibleId,
    deletedAt: isoDateTime,
    deletedBy: zod_1.z.string().optional(),
})
    .passthrough();
exports.UserInvitationAcceptedPayload = zod_1.z
    .object({
    userId: flexibleId,
    email: zod_1.z.string().email(),
    invitationId: zod_1.z.string().optional(),
    acceptedAt: isoDateTime,
})
    .passthrough();
exports.UserSessionRevokedPayload = zod_1.z
    .object({
    userId: flexibleId,
    sessionId: zod_1.z.string().optional(),
    jti: zod_1.z.string().optional(),
    revokedAt: isoDateTime,
    reason: zod_1.z.string().optional(),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Entity events
// ──────────────────────────────────────────────────────────────────────────
exports.EntityCreatedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    name: zod_1.z.string(),
    type: zod_1.z.string().optional(),
    organizationId: zod_1.z.string().optional(),
    createdAt: isoDateTime.optional(),
})
    .passthrough();
exports.EntityUpdatedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    name: zod_1.z.string().optional(),
    updatedAt: isoDateTime.optional(),
})
    .passthrough();
exports.EntityDeletedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    deletedAt: isoDateTime,
    deletedBy: zod_1.z.string().optional(),
})
    .passthrough();
exports.EntityDeactivatedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    deactivatedAt: isoDateTime,
    reason: zod_1.z.string().optional(),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Organization events
// ──────────────────────────────────────────────────────────────────────────
exports.OrganizationCreatedPayload = zod_1.z
    .object({
    organizationId: flexibleId,
    name: zod_1.z.string(),
    parentEntityId: zod_1.z.string().optional(),
    createdAt: isoDateTime.optional(),
})
    .passthrough();
exports.OrganizationUpdatedPayload = zod_1.z
    .object({
    organizationId: flexibleId,
    name: zod_1.z.string().optional(),
    updatedAt: isoDateTime.optional(),
})
    .passthrough();
exports.OrganizationDeletedPayload = zod_1.z
    .object({
    organizationId: flexibleId,
    deletedAt: isoDateTime,
    deletedBy: zod_1.z.string().optional(),
})
    .passthrough();
exports.OrganizationDeactivatedPayload = zod_1.z
    .object({
    organizationId: flexibleId,
    deactivatedAt: isoDateTime,
    reason: zod_1.z.string().optional(),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Organization assignment events
// ──────────────────────────────────────────────────────────────────────────
exports.OrganizationAssignmentPayload = zod_1.z
    .object({
    assignmentId: flexibleId,
    organizationId: flexibleId,
    userId: flexibleId,
    roleId: zod_1.z.string().optional(),
    createdAt: isoDateTime.optional(),
    updatedAt: isoDateTime.optional(),
})
    .passthrough();
exports.OrganizationAssignmentRemovedPayload = zod_1.z
    .object({
    assignmentId: flexibleId,
    organizationId: flexibleId,
    userId: flexibleId,
    removedAt: isoDateTime,
    reason: zod_1.z.string().optional(),
})
    .passthrough();
exports.OrganizationAssignedPayload = zod_1.z
    .object({
    organizationId: flexibleId,
    userId: flexibleId,
    assignedAt: isoDateTime,
})
    .passthrough();
exports.OrganizationUnassignedPayload = zod_1.z
    .object({
    organizationId: flexibleId,
    userId: flexibleId,
    unassignedAt: isoDateTime,
    reason: zod_1.z.string().optional(),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Role events
// ──────────────────────────────────────────────────────────────────────────
exports.RoleCreatedPayload = zod_1.z
    .object({
    roleId: flexibleId,
    roleName: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
    createdAt: isoDateTime.optional(),
})
    .passthrough();
exports.RoleUpdatedPayload = zod_1.z
    .object({
    roleId: flexibleId,
    roleName: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
    updatedAt: isoDateTime.optional(),
})
    .passthrough();
exports.RoleDeletedPayload = zod_1.z
    .object({
    roleId: flexibleId,
    roleName: zod_1.z.string().optional(),
    transferredToRoleId: zod_1.z.string().optional(),
    affectedUsersCount: zod_1.z.number().int().default(0),
    deletedBy: zod_1.z.string().optional(),
    deletedAt: isoDateTime,
})
    .passthrough();
exports.RoleAssignedPayload = zod_1.z
    .object({
    assignmentId: flexibleId,
    roleId: flexibleId,
    userId: flexibleId,
    entityId: zod_1.z.string().optional(),
    assignedAt: isoDateTime,
    assignedBy: zod_1.z.string().optional(),
    expiresAt: isoDateTime.optional(),
})
    .passthrough();
exports.RoleUnassignedPayload = zod_1.z
    .object({
    assignmentId: flexibleId,
    roleId: flexibleId,
    userId: flexibleId,
    unassignedAt: isoDateTime,
    reason: zod_1.z.string().optional(),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Credit events
// ──────────────────────────────────────────────────────────────────────────
exports.CreditAllocatedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    deltaAmount: zod_1.z.number(),
    allocationId: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
    allocatedAt: isoDateTime.optional(),
})
    .passthrough();
exports.CreditConsumedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    userId: zod_1.z.string().optional(),
    amount: zod_1.z.number(),
    operationType: zod_1.z.string(),
    operationId: zod_1.z.string().optional(),
    consumedAt: isoDateTime.optional(),
})
    .passthrough();
exports.CreditRevokedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    revokedAmount: zod_1.z.number(),
    reason: zod_1.z.string().optional(),
    revokedAt: isoDateTime,
    revokedBy: zod_1.z.string().optional(),
})
    .passthrough();
exports.CreditExpiredPayload = zod_1.z
    .object({
    entityId: flexibleId,
    expiredAmount: zod_1.z.number(),
    expiredAt: isoDateTime,
})
    .passthrough();
exports.CreditConfigUpdatedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    config: zod_1.z.record(zod_1.z.unknown()),
    updatedAt: isoDateTime,
    updatedBy: zod_1.z.string().optional(),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Subscription events
// ──────────────────────────────────────────────────────────────────────────
const SubscriptionPayloadBase = zod_1.z
    .object({
    plan: zod_1.z.string(),
    oldPlan: zod_1.z.string().optional(),
    status: zod_1.z.string(),
    effectiveDate: isoDateTime.optional(),
    cancelAt: isoDateTime.optional(),
    renewalDate: isoDateTime.optional(),
    nextBillingDate: isoDateTime.optional(),
    isTrialUser: zod_1.z.boolean().optional(),
    reason: zod_1.z.string().optional(),
})
    .passthrough();
exports.SubscriptionCancelScheduledPayload = SubscriptionPayloadBase;
exports.SubscriptionCanceledPayload = SubscriptionPayloadBase;
exports.SubscriptionUpgradedPayload = SubscriptionPayloadBase;
exports.SubscriptionExpiredPayload = SubscriptionPayloadBase;
exports.SubscriptionRenewedPayload = SubscriptionPayloadBase;
// ──────────────────────────────────────────────────────────────────────────
// Tenant events
// ──────────────────────────────────────────────────────────────────────────
exports.TenantOnboardedPayload = zod_1.z
    .object({
    tenantId: flexibleId,
    name: zod_1.z.string().optional(),
    plan: zod_1.z.string().optional(),
    onboardedAt: isoDateTime.optional(),
    snapshot: zod_1.z.record(zod_1.z.unknown()).optional(),
})
    .passthrough();
exports.TenantBootstrappedPayload = zod_1.z
    .object({
    tenantId: flexibleId,
    bootstrappedAt: isoDateTime.optional(),
    enabledAppCodes: zod_1.z.array(zod_1.z.string()).default([]),
})
    .passthrough();
exports.TenantDeletedPayload = zod_1.z
    .object({
    tenantId: flexibleId,
    deletedAt: isoDateTime,
    deletedBy: zod_1.z.string().optional(),
})
    .passthrough();
exports.TenantAppProvisionedPayload = zod_1.z
    .object({
    tenantId: flexibleId,
    appCode: zod_1.z.string(),
    provisionedAt: isoDateTime,
})
    .passthrough();
exports.TenantAppDeprovisionedPayload = zod_1.z
    .object({
    tenantId: flexibleId,
    appCode: zod_1.z.string(),
    deprovisionedAt: isoDateTime,
    reason: zod_1.z.string().optional(),
})
    .passthrough();
exports.TenantApplicationsUpdatedPayload = zod_1.z
    .object({
    tenantId: flexibleId,
    reason: zod_1.z.string().optional(),
    applications: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).default([]),
    enabledAppCodes: zod_1.z.array(zod_1.z.string()).default([]),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Configuration events
// ──────────────────────────────────────────────────────────────────────────
exports.ConfigurationUpdatedPayload = zod_1.z
    .object({
    scope: zod_1.z.string(),
    key: zod_1.z.string().optional(),
    value: zod_1.z.unknown().optional(),
    updatedAt: isoDateTime,
    updatedBy: zod_1.z.string().optional(),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Accounting events
// ──────────────────────────────────────────────────────────────────────────
exports.AccountingEntityProvisionRequestedPayload = zod_1.z
    .object({
    entityId: flexibleId,
    appCode: zod_1.z.string().default('accounting'),
    requestedAt: isoDateTime.optional(),
    requestedBy: zod_1.z.string().optional(),
})
    .passthrough();
// ──────────────────────────────────────────────────────────────────────────
// Registry
// ──────────────────────────────────────────────────────────────────────────
exports.EVENT_REGISTRY = {
    // user
    'user.created': exports.UserCreatedPayload,
    'user.updated': exports.UserUpdatedPayload,
    'user.deactivated': exports.UserDeactivatedPayload,
    'user.deleted': exports.UserDeletedPayload,
    'user.invitation.accepted': exports.UserInvitationAcceptedPayload,
    'user.session.revoked': exports.UserSessionRevokedPayload,
    // entity
    'entity.created': exports.EntityCreatedPayload,
    'entity.updated': exports.EntityUpdatedPayload,
    'entity.deleted': exports.EntityDeletedPayload,
    'entity.deactivated': exports.EntityDeactivatedPayload,
    // organization
    'organization.created': exports.OrganizationCreatedPayload,
    'organization.updated': exports.OrganizationUpdatedPayload,
    'organization.deleted': exports.OrganizationDeletedPayload,
    'organization.deactivated': exports.OrganizationDeactivatedPayload,
    // organization assignment
    'organization.assignment.created': exports.OrganizationAssignmentPayload,
    'organization.assignment.added': exports.OrganizationAssignmentPayload,
    'organization.assignment.updated': exports.OrganizationAssignmentPayload,
    'organization.assignment.changed': exports.OrganizationAssignmentPayload,
    'organization.assignment.deleted': exports.OrganizationAssignmentRemovedPayload,
    'organization.assignment.deactivated': exports.OrganizationAssignmentRemovedPayload,
    'organization.assigned': exports.OrganizationAssignedPayload,
    'organization.unassigned': exports.OrganizationUnassignedPayload,
    // role
    'role.created': exports.RoleCreatedPayload,
    'role.updated': exports.RoleUpdatedPayload,
    'role.deleted': exports.RoleDeletedPayload,
    'role.assigned': exports.RoleAssignedPayload,
    'role.unassigned': exports.RoleUnassignedPayload,
    // credit
    'credit.allocated': exports.CreditAllocatedPayload,
    'credit.consumed': exports.CreditConsumedPayload,
    'credit.revoked': exports.CreditRevokedPayload,
    'credit.expired': exports.CreditExpiredPayload,
    'credit.config.updated': exports.CreditConfigUpdatedPayload,
    // subscription
    'subscription.cancel_scheduled': exports.SubscriptionCancelScheduledPayload,
    'subscription.canceled': exports.SubscriptionCanceledPayload,
    'subscription.upgraded': exports.SubscriptionUpgradedPayload,
    'subscription.expired': exports.SubscriptionExpiredPayload,
    'subscription.renewed': exports.SubscriptionRenewedPayload,
    // tenant
    'tenant.onboarded': exports.TenantOnboardedPayload,
    'tenant.bootstrapped': exports.TenantBootstrappedPayload,
    'tenant.deleted': exports.TenantDeletedPayload,
    'tenant.app.provisioned': exports.TenantAppProvisionedPayload,
    'tenant.app.deprovisioned': exports.TenantAppDeprovisionedPayload,
    'tenant.applications.updated': exports.TenantApplicationsUpdatedPayload,
    // configuration
    'configuration.updated': exports.ConfigurationUpdatedPayload,
    // accounting
    'accounting.entity.provision.requested': exports.AccountingEntityProvisionRequestedPayload,
};
// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
/** Returns true if the given string is a known event type in the registry. */
function isKnownEventType(eventType) {
    return Object.prototype.hasOwnProperty.call(exports.EVENT_REGISTRY, eventType);
}
function validateEvent(eventType, payload) {
    if (!isKnownEventType(eventType)) {
        return {
            success: false,
            error: `Unknown event type: '${eventType}'`,
        };
    }
    const schema = exports.EVENT_REGISTRY[eventType];
    const result = schema.safeParse(payload);
    if (!result.success) {
        return { success: false, error: result.error.message };
    }
    return { success: true, data: result.data };
}
//# sourceMappingURL=registry.js.map