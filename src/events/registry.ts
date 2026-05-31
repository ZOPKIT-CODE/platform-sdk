import { z } from 'zod';

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

export const SERVICE_NAMES = ['wrapper', 'crm', 'accounting', 'ops'] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number];

export const EventEnvelope = z.object({
  event_id: z.string().uuid(),
  event_type: z.string(),
  timestamp: z.string().datetime(),
  source_service: z.enum(SERVICE_NAMES),
  target_service: z.enum(SERVICE_NAMES).optional(),
  tenant_id: z.string().uuid(),
  payload: z.unknown(),
  version: z.number().int().default(1),
});

export type EventEnvelope = z.infer<typeof EventEnvelope>;

// ──────────────────────────────────────────────────────────────────────────
// Shared building blocks
// ──────────────────────────────────────────────────────────────────────────

const isoDateTime = z.string().datetime();
const uuid = z.string().uuid();
const flexibleId = z.string().min(1); // some legacy ids are not UUIDs

// ──────────────────────────────────────────────────────────────────────────
// User events
// ──────────────────────────────────────────────────────────────────────────

export const UserCreatedPayload = z
  .object({
    userId: flexibleId,
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    isActive: z.boolean().default(true),
    kindeUserId: z.string().optional(),
    createdAt: isoDateTime.optional(),
  })
  .passthrough();

export const UserUpdatedPayload = z
  .object({
    userId: flexibleId,
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    isActive: z.boolean().optional(),
    updatedAt: isoDateTime.optional(),
  })
  .passthrough();

export const UserDeactivatedPayload = z
  .object({
    userId: flexibleId,
    deactivatedAt: isoDateTime,
    reason: z.string().optional(),
  })
  .passthrough();

export const UserDeletedPayload = z
  .object({
    userId: flexibleId,
    deletedAt: isoDateTime,
    deletedBy: z.string().optional(),
  })
  .passthrough();

export const UserInvitationAcceptedPayload = z
  .object({
    userId: flexibleId,
    email: z.string().email(),
    invitationId: z.string().optional(),
    acceptedAt: isoDateTime,
  })
  .passthrough();

export const UserSessionRevokedPayload = z
  .object({
    userId: flexibleId,
    sessionId: z.string().optional(),
    jti: z.string().optional(),
    revokedAt: isoDateTime,
    reason: z.string().optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Entity events
// ──────────────────────────────────────────────────────────────────────────

export const EntityCreatedPayload = z
  .object({
    entityId: flexibleId,
    name: z.string(),
    type: z.string().optional(),
    organizationId: z.string().optional(),
    createdAt: isoDateTime.optional(),
  })
  .passthrough();

export const EntityUpdatedPayload = z
  .object({
    entityId: flexibleId,
    name: z.string().optional(),
    updatedAt: isoDateTime.optional(),
  })
  .passthrough();

export const EntityDeletedPayload = z
  .object({
    entityId: flexibleId,
    deletedAt: isoDateTime,
    deletedBy: z.string().optional(),
  })
  .passthrough();

export const EntityDeactivatedPayload = z
  .object({
    entityId: flexibleId,
    deactivatedAt: isoDateTime,
    reason: z.string().optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Organization events
// ──────────────────────────────────────────────────────────────────────────

export const OrganizationCreatedPayload = z
  .object({
    organizationId: flexibleId,
    name: z.string(),
    parentEntityId: z.string().optional(),
    createdAt: isoDateTime.optional(),
  })
  .passthrough();

export const OrganizationUpdatedPayload = z
  .object({
    organizationId: flexibleId,
    name: z.string().optional(),
    updatedAt: isoDateTime.optional(),
  })
  .passthrough();

export const OrganizationDeletedPayload = z
  .object({
    organizationId: flexibleId,
    deletedAt: isoDateTime,
    deletedBy: z.string().optional(),
  })
  .passthrough();

export const OrganizationDeactivatedPayload = z
  .object({
    organizationId: flexibleId,
    deactivatedAt: isoDateTime,
    reason: z.string().optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Organization assignment events
// ──────────────────────────────────────────────────────────────────────────

export const OrganizationAssignmentPayload = z
  .object({
    assignmentId: flexibleId,
    organizationId: flexibleId,
    userId: flexibleId,
    roleId: z.string().optional(),
    createdAt: isoDateTime.optional(),
    updatedAt: isoDateTime.optional(),
  })
  .passthrough();

export const OrganizationAssignmentRemovedPayload = z
  .object({
    assignmentId: flexibleId,
    organizationId: flexibleId,
    userId: flexibleId,
    removedAt: isoDateTime,
    reason: z.string().optional(),
  })
  .passthrough();

export const OrganizationAssignedPayload = z
  .object({
    organizationId: flexibleId,
    userId: flexibleId,
    assignedAt: isoDateTime,
  })
  .passthrough();

export const OrganizationUnassignedPayload = z
  .object({
    organizationId: flexibleId,
    userId: flexibleId,
    unassignedAt: isoDateTime,
    reason: z.string().optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Role events
// ──────────────────────────────────────────────────────────────────────────

export const RoleCreatedPayload = z
  .object({
    roleId: flexibleId,
    roleName: z.string(),
    description: z.string().optional(),
    permissions: z.array(z.string()).default([]),
    createdAt: isoDateTime.optional(),
  })
  .passthrough();

export const RoleUpdatedPayload = z
  .object({
    roleId: flexibleId,
    roleName: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    updatedAt: isoDateTime.optional(),
  })
  .passthrough();

export const RoleDeletedPayload = z
  .object({
    roleId: flexibleId,
    roleName: z.string().optional(),
    transferredToRoleId: z.string().optional(),
    affectedUsersCount: z.number().int().default(0),
    deletedBy: z.string().optional(),
    deletedAt: isoDateTime,
  })
  .passthrough();

export const RoleAssignedPayload = z
  .object({
    assignmentId: flexibleId,
    roleId: flexibleId,
    userId: flexibleId,
    entityId: z.string().optional(),
    assignedAt: isoDateTime,
    assignedBy: z.string().optional(),
    expiresAt: isoDateTime.optional(),
  })
  .passthrough();

export const RoleUnassignedPayload = z
  .object({
    assignmentId: flexibleId,
    roleId: flexibleId,
    userId: flexibleId,
    unassignedAt: isoDateTime,
    reason: z.string().optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Credit events
// ──────────────────────────────────────────────────────────────────────────

export const CreditAllocatedPayload = z
  .object({
    entityId: flexibleId,
    deltaAmount: z.number(),
    allocationId: z.string().optional(),
    reason: z.string().optional(),
    allocatedAt: isoDateTime.optional(),
  })
  .passthrough();

export const CreditConsumedPayload = z
  .object({
    entityId: flexibleId,
    userId: z.string().optional(),
    amount: z.number(),
    operationType: z.string(),
    operationId: z.string().optional(),
    consumedAt: isoDateTime.optional(),
  })
  .passthrough();

export const CreditRevokedPayload = z
  .object({
    entityId: flexibleId,
    revokedAmount: z.number(),
    reason: z.string().optional(),
    revokedAt: isoDateTime,
    revokedBy: z.string().optional(),
  })
  .passthrough();

export const CreditExpiredPayload = z
  .object({
    entityId: flexibleId,
    expiredAmount: z.number(),
    expiredAt: isoDateTime,
  })
  .passthrough();

export const CreditConfigUpdatedPayload = z
  .object({
    entityId: flexibleId,
    config: z.record(z.unknown()),
    updatedAt: isoDateTime,
    updatedBy: z.string().optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Subscription events
// ──────────────────────────────────────────────────────────────────────────

const SubscriptionPayloadBase = z
  .object({
    plan: z.string(),
    oldPlan: z.string().optional(),
    status: z.string(),
    effectiveDate: isoDateTime.optional(),
    cancelAt: isoDateTime.optional(),
    renewalDate: isoDateTime.optional(),
    nextBillingDate: isoDateTime.optional(),
    isTrialUser: z.boolean().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

export const SubscriptionCancelScheduledPayload = SubscriptionPayloadBase;
export const SubscriptionCanceledPayload = SubscriptionPayloadBase;
export const SubscriptionUpgradedPayload = SubscriptionPayloadBase;
export const SubscriptionExpiredPayload = SubscriptionPayloadBase;
export const SubscriptionRenewedPayload = SubscriptionPayloadBase;

// ──────────────────────────────────────────────────────────────────────────
// Tenant events
// ──────────────────────────────────────────────────────────────────────────

export const TenantOnboardedPayload = z
  .object({
    tenantId: flexibleId,
    name: z.string().optional(),
    plan: z.string().optional(),
    onboardedAt: isoDateTime.optional(),
    snapshot: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const TenantBootstrappedPayload = z
  .object({
    tenantId: flexibleId,
    bootstrappedAt: isoDateTime.optional(),
    enabledAppCodes: z.array(z.string()).default([]),
  })
  .passthrough();

export const TenantDeletedPayload = z
  .object({
    tenantId: flexibleId,
    deletedAt: isoDateTime,
    deletedBy: z.string().optional(),
  })
  .passthrough();

export const TenantAppProvisionedPayload = z
  .object({
    tenantId: flexibleId,
    appCode: z.string(),
    provisionedAt: isoDateTime,
  })
  .passthrough();

export const TenantAppDeprovisionedPayload = z
  .object({
    tenantId: flexibleId,
    appCode: z.string(),
    deprovisionedAt: isoDateTime,
    reason: z.string().optional(),
  })
  .passthrough();

export const TenantApplicationsUpdatedPayload = z
  .object({
    tenantId: flexibleId,
    reason: z.string().optional(),
    applications: z.array(z.record(z.unknown())).default([]),
    enabledAppCodes: z.array(z.string()).default([]),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Configuration events
// ──────────────────────────────────────────────────────────────────────────

export const ConfigurationUpdatedPayload = z
  .object({
    scope: z.string(),
    key: z.string().optional(),
    value: z.unknown().optional(),
    updatedAt: isoDateTime,
    updatedBy: z.string().optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Accounting events
// ──────────────────────────────────────────────────────────────────────────

export const AccountingEntityProvisionRequestedPayload = z
  .object({
    entityId: flexibleId,
    appCode: z.string().default('accounting'),
    requestedAt: isoDateTime.optional(),
    requestedBy: z.string().optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────────
// Registry
// ──────────────────────────────────────────────────────────────────────────

export const EVENT_REGISTRY = {
  // user
  'user.created': UserCreatedPayload,
  'user.updated': UserUpdatedPayload,
  'user.deactivated': UserDeactivatedPayload,
  'user.deleted': UserDeletedPayload,
  'user.invitation.accepted': UserInvitationAcceptedPayload,
  'user.session.revoked': UserSessionRevokedPayload,

  // entity
  'entity.created': EntityCreatedPayload,
  'entity.updated': EntityUpdatedPayload,
  'entity.deleted': EntityDeletedPayload,
  'entity.deactivated': EntityDeactivatedPayload,

  // organization
  'organization.created': OrganizationCreatedPayload,
  'organization.updated': OrganizationUpdatedPayload,
  'organization.deleted': OrganizationDeletedPayload,
  'organization.deactivated': OrganizationDeactivatedPayload,

  // organization assignment
  'organization.assignment.created': OrganizationAssignmentPayload,
  'organization.assignment.added': OrganizationAssignmentPayload,
  'organization.assignment.updated': OrganizationAssignmentPayload,
  'organization.assignment.changed': OrganizationAssignmentPayload,
  'organization.assignment.deleted': OrganizationAssignmentRemovedPayload,
  'organization.assignment.deactivated': OrganizationAssignmentRemovedPayload,
  'organization.assigned': OrganizationAssignedPayload,
  'organization.unassigned': OrganizationUnassignedPayload,

  // role
  'role.created': RoleCreatedPayload,
  'role.updated': RoleUpdatedPayload,
  'role.deleted': RoleDeletedPayload,
  'role.assigned': RoleAssignedPayload,
  'role.unassigned': RoleUnassignedPayload,

  // credit
  'credit.allocated': CreditAllocatedPayload,
  'credit.consumed': CreditConsumedPayload,
  'credit.revoked': CreditRevokedPayload,
  'credit.expired': CreditExpiredPayload,
  'credit.config.updated': CreditConfigUpdatedPayload,

  // subscription
  'subscription.cancel_scheduled': SubscriptionCancelScheduledPayload,
  'subscription.canceled': SubscriptionCanceledPayload,
  'subscription.upgraded': SubscriptionUpgradedPayload,
  'subscription.expired': SubscriptionExpiredPayload,
  'subscription.renewed': SubscriptionRenewedPayload,

  // tenant
  'tenant.onboarded': TenantOnboardedPayload,
  'tenant.bootstrapped': TenantBootstrappedPayload,
  'tenant.deleted': TenantDeletedPayload,
  'tenant.app.provisioned': TenantAppProvisionedPayload,
  'tenant.app.deprovisioned': TenantAppDeprovisionedPayload,
  'tenant.applications.updated': TenantApplicationsUpdatedPayload,

  // configuration
  'configuration.updated': ConfigurationUpdatedPayload,

  // accounting
  'accounting.entity.provision.requested': AccountingEntityProvisionRequestedPayload,
} as const;

export type EventType = keyof typeof EVENT_REGISTRY;

/** Type-level lookup of a payload type from its event type string. */
export type PayloadOf<E extends EventType> = z.infer<(typeof EVENT_REGISTRY)[E]>;

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Returns true if the given string is a known event type in the registry. */
export function isKnownEventType(eventType: string): eventType is EventType {
  return Object.prototype.hasOwnProperty.call(EVENT_REGISTRY, eventType);
}

export type ValidateEventResult<E extends EventType = EventType> =
  | { success: true; data: PayloadOf<E> }
  | { success: false; error: string };

/**
 * Validate a payload against the schema registered for the given event type.
 *
 * Returns a discriminated `{ success: true, data } | { success: false, error }`
 * so callers can branch without try/catch. Returns `{ success: false }` with
 * an explanatory message if the event type is unknown.
 */
export function validateEvent<E extends EventType>(
  eventType: E,
  payload: unknown,
): ValidateEventResult<E>;
export function validateEvent(
  eventType: string,
  payload: unknown,
): ValidateEventResult;
export function validateEvent(
  eventType: string,
  payload: unknown,
): ValidateEventResult {
  if (!isKnownEventType(eventType)) {
    return {
      success: false,
      error: `Unknown event type: '${eventType}'`,
    };
  }

  const schema = EVENT_REGISTRY[eventType];
  const result = schema.safeParse(payload);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}
