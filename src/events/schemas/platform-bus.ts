import { z } from 'zod';

// ---------------------------------------------------------------------------
// Platform Bus schemas — events published by Wrapper to all applications.
// All event types are prefixed with 'wrapper.'
// ---------------------------------------------------------------------------

const baseEntity = z.object({
  id: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// --- Tenant lifecycle -------------------------------------------------------

export const TenantOnboardedPayload = z.object({
  snapshot: z.object({
    tenant: z.object({
      id: z.string(),
      name: z.string(),
      kindeOrgId: z.string(),
      plan: z.string().optional(),
      subscription: z.record(z.unknown()).optional(),
    }),
    organizations: z.array(z.record(z.unknown())).default([]),
    users: z.array(z.record(z.unknown())).default([]),
    roles: z.array(z.record(z.unknown())).default([]),
    roleAssignments: z.array(z.record(z.unknown())).default([]),
    creditConfigs: z.array(z.record(z.unknown())).default([]),
    entityCredits: z.array(z.record(z.unknown())).default([]),
    onboardingProfile: z
      .object({
        primaryUseCase: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.string().optional(),
      })
      .optional(),
  }),
});

export const TenantAppProvisionedPayload = z.object({
  appCode: z.string(),
  provisionedAt: z.string().datetime(),
});

export const TenantApplicationsUpdatedPayload = z.object({
  reason: z.string(),
  applications: z.array(z.record(z.unknown())),
  enabledAppCodes: z.array(z.string()),
});

export const TenantDeletedPayload = z.object({
  deletedAt: z.string().datetime(),
  deletedBy: z.string().optional(),
});

// --- User events -----------------------------------------------------------

export const UserPayload = baseEntity.extend({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isActive: z.boolean().default(true),
  kindeUserId: z.string().optional(),
});

export const UserDeactivatedPayload = z.object({
  userId: z.string(),
  deactivatedAt: z.string().datetime(),
  reason: z.string().optional(),
});

export const UserSessionRevokedPayload = z.object({
  userId: z.string(),
  revokedAt: z.string().datetime(),
  reason: z.string().optional(),
});

// --- Role events -----------------------------------------------------------

export const RolePayload = baseEntity.extend({
  roleName: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  restrictions: z.record(z.unknown()).optional(),
});

export const RoleDeletedPayload = z.object({
  roleId: z.string(),
  roleName: z.string(),
  transferredToRoleId: z.string().optional(),
  affectedUsersCount: z.number().int().default(0),
  deletedBy: z.string().optional(),
  deletedAt: z.string().datetime(),
});

export const RoleAssignmentPayload = z.object({
  assignmentId: z.string(),
  roleId: z.string(),
  userId: z.string(),
  assignedAt: z.string().datetime(),
  assignedBy: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  entityId: z.string().optional(),
});

export const RoleUnassignedPayload = z.object({
  assignmentId: z.string(),
  roleId: z.string(),
  userId: z.string(),
  unassignedAt: z.string().datetime(),
  reason: z.string().optional(),
});

// --- Organisation assignment events ----------------------------------------

export const OrgAssignmentPayload = z.object({
  assignmentId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  roleId: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// --- Subscription events ---------------------------------------------------

export const SubscriptionUpdatedPayload = z.object({
  plan: z.string(),
  oldPlan: z.string().optional(),
  status: z.string(),
  effectiveDate: z.string().datetime().optional(),
  cancelAt: z.string().datetime().optional(),
  renewalDate: z.string().datetime().optional(),
  nextBillingDate: z.string().datetime().optional(),
  isTrialUser: z.boolean().optional(),
  reason: z.string().optional(),
});

// --- Credit events ---------------------------------------------------------

export const CreditAllocatedPayload = z.object({
  entityId: z.string(),
  deltaAmount: z.number(),
  allocationId: z.string().optional(),
  reason: z.string().optional(),
});

export const CreditConsumedPayload = z.object({
  entityId: z.string(),
  userId: z.string().optional(),
  amount: z.number(),
  operationType: z.string(),
  operationId: z.string().optional(),
});

export const CreditExpiredPayload = z.object({
  entityId: z.string(),
  expiredAmount: z.number(),
  expiredAt: z.string().datetime(),
});

export const CreditRevokedPayload = z.object({
  entityId: z.string(),
  revokedAmount: z.number(),
  reason: z.string().optional(),
  revokedAt: z.string().datetime(),
  revokedBy: z.string().optional(),
});

export const AccountingEntityProvisionPayload = z.object({
  entityId: z.string(),
  appCode: z.string().default('accounting'),
  provisionedAt: z.string().datetime().optional(),
});

// --- Registry: event type → payload schema --------------------------------

export const PLATFORM_BUS_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'wrapper.tenant.onboarded': TenantOnboardedPayload,
  'wrapper.tenant.app.provisioned': TenantAppProvisionedPayload,
  'wrapper.tenant.app.deprovisioned': TenantAppProvisionedPayload,
  'wrapper.tenant.applications.updated': TenantApplicationsUpdatedPayload,
  'wrapper.tenant.deleted': TenantDeletedPayload,
  'wrapper.user.created': UserPayload,
  'wrapper.user.updated': UserPayload,
  'wrapper.user.deactivated': UserDeactivatedPayload,
  'wrapper.user.deleted': UserDeactivatedPayload,
  'wrapper.user.invitation.accepted': UserPayload,
  'wrapper.user.session.revoked': UserSessionRevokedPayload,
  'wrapper.role.created': RolePayload,
  'wrapper.role.updated': RolePayload,
  'wrapper.role.deleted': RoleDeletedPayload,
  'wrapper.role.assigned': RoleAssignmentPayload,
  'wrapper.role.unassigned': RoleUnassignedPayload,
  'wrapper.organization.assignment.created': OrgAssignmentPayload,
  'wrapper.organization.assignment.updated': OrgAssignmentPayload,
  'wrapper.organization.assignment.deleted': OrgAssignmentPayload,
  'wrapper.subscription.upgraded': SubscriptionUpdatedPayload,
  'wrapper.subscription.canceled': SubscriptionUpdatedPayload,
  'wrapper.subscription.renewed': SubscriptionUpdatedPayload,
  'wrapper.subscription.cancel_scheduled': SubscriptionUpdatedPayload,
  'wrapper.credit.allocated': CreditAllocatedPayload,
  'wrapper.credit.consumed': CreditConsumedPayload,
  'wrapper.credit.expired': CreditExpiredPayload,
  'wrapper.credit.revoked': CreditRevokedPayload,
  'wrapper.accounting.entity.provision.requested': AccountingEntityProvisionPayload,
};

export type TenantOnboardedPayload = z.infer<typeof TenantOnboardedPayload>;
export type UserPayload = z.infer<typeof UserPayload>;
export type RolePayload = z.infer<typeof RolePayload>;
export type RoleAssignmentPayload = z.infer<typeof RoleAssignmentPayload>;
export type SubscriptionUpdatedPayload = z.infer<typeof SubscriptionUpdatedPayload>;
export type CreditAllocatedPayload = z.infer<typeof CreditAllocatedPayload>;
export type CreditRevokedPayload = z.infer<typeof CreditRevokedPayload>;
export type AccountingEntityProvisionPayload = z.infer<typeof AccountingEntityProvisionPayload>;
