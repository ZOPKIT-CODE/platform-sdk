"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_BUS_SCHEMAS = exports.AccountingEntityProvisionPayload = exports.CreditRevokedPayload = exports.CreditExpiredPayload = exports.CreditConsumedPayload = exports.CreditAllocatedPayload = exports.SubscriptionUpdatedPayload = exports.OrgAssignmentPayload = exports.RoleUnassignedPayload = exports.RoleAssignmentPayload = exports.RoleDeletedPayload = exports.RolePayload = exports.UserSessionRevokedPayload = exports.UserDeactivatedPayload = exports.UserPayload = exports.TenantDeletedPayload = exports.TenantApplicationsUpdatedPayload = exports.TenantAppProvisionedPayload = exports.TenantOnboardedPayload = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Platform Bus schemas — events published by Wrapper to all applications.
// All event types are prefixed with 'wrapper.'
// ---------------------------------------------------------------------------
const baseEntity = zod_1.z.object({
    id: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime().optional(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// --- Tenant lifecycle -------------------------------------------------------
exports.TenantOnboardedPayload = zod_1.z.object({
    snapshot: zod_1.z.object({
        tenant: zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            kindeOrgId: zod_1.z.string(),
            plan: zod_1.z.string().optional(),
            subscription: zod_1.z.record(zod_1.z.unknown()).optional(),
        }),
        organizations: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).default([]),
        users: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).default([]),
        roles: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).default([]),
        roleAssignments: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).default([]),
        creditConfigs: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).default([]),
        entityCredits: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).default([]),
        onboardingProfile: zod_1.z
            .object({
            primaryUseCase: zod_1.z.string().optional(),
            industry: zod_1.z.string().optional(),
            companySize: zod_1.z.string().optional(),
        })
            .optional(),
    }),
});
exports.TenantAppProvisionedPayload = zod_1.z.object({
    appCode: zod_1.z.string(),
    provisionedAt: zod_1.z.string().datetime(),
});
exports.TenantApplicationsUpdatedPayload = zod_1.z.object({
    reason: zod_1.z.string(),
    applications: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())),
    enabledAppCodes: zod_1.z.array(zod_1.z.string()),
});
exports.TenantDeletedPayload = zod_1.z.object({
    deletedAt: zod_1.z.string().datetime(),
    deletedBy: zod_1.z.string().optional(),
});
// --- User events -----------------------------------------------------------
exports.UserPayload = baseEntity.extend({
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().default(true),
    kindeUserId: zod_1.z.string().optional(),
});
exports.UserDeactivatedPayload = zod_1.z.object({
    userId: zod_1.z.string(),
    deactivatedAt: zod_1.z.string().datetime(),
    reason: zod_1.z.string().optional(),
});
exports.UserSessionRevokedPayload = zod_1.z.object({
    userId: zod_1.z.string(),
    revokedAt: zod_1.z.string().datetime(),
    reason: zod_1.z.string().optional(),
});
// --- Role events -----------------------------------------------------------
exports.RolePayload = baseEntity.extend({
    roleName: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
    restrictions: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.RoleDeletedPayload = zod_1.z.object({
    roleId: zod_1.z.string(),
    roleName: zod_1.z.string(),
    transferredToRoleId: zod_1.z.string().optional(),
    affectedUsersCount: zod_1.z.number().int().default(0),
    deletedBy: zod_1.z.string().optional(),
    deletedAt: zod_1.z.string().datetime(),
});
exports.RoleAssignmentPayload = zod_1.z.object({
    assignmentId: zod_1.z.string(),
    roleId: zod_1.z.string(),
    userId: zod_1.z.string(),
    assignedAt: zod_1.z.string().datetime(),
    assignedBy: zod_1.z.string().optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
    entityId: zod_1.z.string().optional(),
});
exports.RoleUnassignedPayload = zod_1.z.object({
    assignmentId: zod_1.z.string(),
    roleId: zod_1.z.string(),
    userId: zod_1.z.string(),
    unassignedAt: zod_1.z.string().datetime(),
    reason: zod_1.z.string().optional(),
});
// --- Organisation assignment events ----------------------------------------
exports.OrgAssignmentPayload = zod_1.z.object({
    assignmentId: zod_1.z.string(),
    organizationId: zod_1.z.string(),
    userId: zod_1.z.string(),
    roleId: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime().optional(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// --- Subscription events ---------------------------------------------------
exports.SubscriptionUpdatedPayload = zod_1.z.object({
    plan: zod_1.z.string(),
    oldPlan: zod_1.z.string().optional(),
    status: zod_1.z.string(),
    effectiveDate: zod_1.z.string().datetime().optional(),
    cancelAt: zod_1.z.string().datetime().optional(),
    renewalDate: zod_1.z.string().datetime().optional(),
    nextBillingDate: zod_1.z.string().datetime().optional(),
    isTrialUser: zod_1.z.boolean().optional(),
    reason: zod_1.z.string().optional(),
});
// --- Credit events ---------------------------------------------------------
exports.CreditAllocatedPayload = zod_1.z.object({
    entityId: zod_1.z.string(),
    deltaAmount: zod_1.z.number(),
    allocationId: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
});
exports.CreditConsumedPayload = zod_1.z.object({
    entityId: zod_1.z.string(),
    userId: zod_1.z.string().optional(),
    amount: zod_1.z.number(),
    operationType: zod_1.z.string(),
    operationId: zod_1.z.string().optional(),
});
exports.CreditExpiredPayload = zod_1.z.object({
    entityId: zod_1.z.string(),
    expiredAmount: zod_1.z.number(),
    expiredAt: zod_1.z.string().datetime(),
});
exports.CreditRevokedPayload = zod_1.z.object({
    entityId: zod_1.z.string(),
    revokedAmount: zod_1.z.number(),
    reason: zod_1.z.string().optional(),
    revokedAt: zod_1.z.string().datetime(),
    revokedBy: zod_1.z.string().optional(),
});
exports.AccountingEntityProvisionPayload = zod_1.z.object({
    entityId: zod_1.z.string(),
    appCode: zod_1.z.string().default('accounting'),
    provisionedAt: zod_1.z.string().datetime().optional(),
});
// --- Registry: event type → payload schema --------------------------------
exports.PLATFORM_BUS_SCHEMAS = {
    'wrapper.tenant.onboarded': exports.TenantOnboardedPayload,
    'wrapper.tenant.app.provisioned': exports.TenantAppProvisionedPayload,
    'wrapper.tenant.app.deprovisioned': exports.TenantAppProvisionedPayload,
    'wrapper.tenant.applications.updated': exports.TenantApplicationsUpdatedPayload,
    'wrapper.tenant.deleted': exports.TenantDeletedPayload,
    'wrapper.user.created': exports.UserPayload,
    'wrapper.user.updated': exports.UserPayload,
    'wrapper.user.deactivated': exports.UserDeactivatedPayload,
    'wrapper.user.deleted': exports.UserDeactivatedPayload,
    'wrapper.user.invitation.accepted': exports.UserPayload,
    'wrapper.user.session.revoked': exports.UserSessionRevokedPayload,
    'wrapper.role.created': exports.RolePayload,
    'wrapper.role.updated': exports.RolePayload,
    'wrapper.role.deleted': exports.RoleDeletedPayload,
    'wrapper.role.assigned': exports.RoleAssignmentPayload,
    'wrapper.role.unassigned': exports.RoleUnassignedPayload,
    'wrapper.organization.assignment.created': exports.OrgAssignmentPayload,
    'wrapper.organization.assignment.updated': exports.OrgAssignmentPayload,
    'wrapper.organization.assignment.deleted': exports.OrgAssignmentPayload,
    'wrapper.subscription.upgraded': exports.SubscriptionUpdatedPayload,
    'wrapper.subscription.canceled': exports.SubscriptionUpdatedPayload,
    'wrapper.subscription.renewed': exports.SubscriptionUpdatedPayload,
    'wrapper.subscription.cancel_scheduled': exports.SubscriptionUpdatedPayload,
    'wrapper.credit.allocated': exports.CreditAllocatedPayload,
    'wrapper.credit.consumed': exports.CreditConsumedPayload,
    'wrapper.credit.expired': exports.CreditExpiredPayload,
    'wrapper.credit.revoked': exports.CreditRevokedPayload,
    'wrapper.accounting.entity.provision.requested': exports.AccountingEntityProvisionPayload,
};
//# sourceMappingURL=platform-bus.js.map