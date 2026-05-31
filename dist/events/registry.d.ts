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
export declare const SERVICE_NAMES: readonly ["wrapper", "crm", "accounting", "ops"];
export type ServiceName = (typeof SERVICE_NAMES)[number];
export declare const EventEnvelope: z.ZodObject<{
    event_id: z.ZodString;
    event_type: z.ZodString;
    timestamp: z.ZodString;
    source_service: z.ZodEnum<["wrapper", "crm", "accounting", "ops"]>;
    target_service: z.ZodOptional<z.ZodEnum<["wrapper", "crm", "accounting", "ops"]>>;
    tenant_id: z.ZodString;
    payload: z.ZodUnknown;
    version: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    event_id: string;
    event_type: string;
    source_service: "wrapper" | "crm" | "accounting" | "ops";
    tenant_id: string;
    version: number;
    payload?: unknown;
    target_service?: "wrapper" | "crm" | "accounting" | "ops" | undefined;
}, {
    timestamp: string;
    event_id: string;
    event_type: string;
    source_service: "wrapper" | "crm" | "accounting" | "ops";
    tenant_id: string;
    payload?: unknown;
    target_service?: "wrapper" | "crm" | "accounting" | "ops" | undefined;
    version?: number | undefined;
}>;
export type EventEnvelope = z.infer<typeof EventEnvelope>;
export declare const UserCreatedPayload: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    kindeUserId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    userId: z.ZodString;
    email: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    kindeUserId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    userId: z.ZodString;
    email: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    kindeUserId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const UserUpdatedPayload: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    userId: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    userId: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const UserDeactivatedPayload: z.ZodObject<{
    userId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    userId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    userId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const UserDeletedPayload: z.ZodObject<{
    userId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    userId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    userId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const UserInvitationAcceptedPayload: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    invitationId: z.ZodOptional<z.ZodString>;
    acceptedAt: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    userId: z.ZodString;
    email: z.ZodString;
    invitationId: z.ZodOptional<z.ZodString>;
    acceptedAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    userId: z.ZodString;
    email: z.ZodString;
    invitationId: z.ZodOptional<z.ZodString>;
    acceptedAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export declare const UserSessionRevokedPayload: z.ZodObject<{
    userId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    jti: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    userId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    jti: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    userId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    jti: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const EntityCreatedPayload: z.ZodObject<{
    entityId: z.ZodString;
    name: z.ZodString;
    type: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    name: z.ZodString;
    type: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    name: z.ZodString;
    type: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const EntityUpdatedPayload: z.ZodObject<{
    entityId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const EntityDeletedPayload: z.ZodObject<{
    entityId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const EntityDeactivatedPayload: z.ZodObject<{
    entityId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OrganizationCreatedPayload: z.ZodObject<{
    organizationId: z.ZodString;
    name: z.ZodString;
    parentEntityId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    organizationId: z.ZodString;
    name: z.ZodString;
    parentEntityId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    organizationId: z.ZodString;
    name: z.ZodString;
    parentEntityId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OrganizationUpdatedPayload: z.ZodObject<{
    organizationId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    organizationId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    organizationId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OrganizationDeletedPayload: z.ZodObject<{
    organizationId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    organizationId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    organizationId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OrganizationDeactivatedPayload: z.ZodObject<{
    organizationId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    organizationId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    organizationId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OrganizationAssignmentPayload: z.ZodObject<{
    assignmentId: z.ZodString;
    organizationId: z.ZodString;
    userId: z.ZodString;
    roleId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    assignmentId: z.ZodString;
    organizationId: z.ZodString;
    userId: z.ZodString;
    roleId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    assignmentId: z.ZodString;
    organizationId: z.ZodString;
    userId: z.ZodString;
    roleId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OrganizationAssignmentRemovedPayload: z.ZodObject<{
    assignmentId: z.ZodString;
    organizationId: z.ZodString;
    userId: z.ZodString;
    removedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    assignmentId: z.ZodString;
    organizationId: z.ZodString;
    userId: z.ZodString;
    removedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    assignmentId: z.ZodString;
    organizationId: z.ZodString;
    userId: z.ZodString;
    removedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OrganizationAssignedPayload: z.ZodObject<{
    organizationId: z.ZodString;
    userId: z.ZodString;
    assignedAt: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    organizationId: z.ZodString;
    userId: z.ZodString;
    assignedAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    organizationId: z.ZodString;
    userId: z.ZodString;
    assignedAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export declare const OrganizationUnassignedPayload: z.ZodObject<{
    organizationId: z.ZodString;
    userId: z.ZodString;
    unassignedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    organizationId: z.ZodString;
    userId: z.ZodString;
    unassignedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    organizationId: z.ZodString;
    userId: z.ZodString;
    unassignedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const RoleCreatedPayload: z.ZodObject<{
    roleId: z.ZodString;
    roleName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    roleId: z.ZodString;
    roleName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    roleId: z.ZodString;
    roleName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const RoleUpdatedPayload: z.ZodObject<{
    roleId: z.ZodString;
    roleName: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    roleId: z.ZodString;
    roleName: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    roleId: z.ZodString;
    roleName: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const RoleDeletedPayload: z.ZodObject<{
    roleId: z.ZodString;
    roleName: z.ZodOptional<z.ZodString>;
    transferredToRoleId: z.ZodOptional<z.ZodString>;
    affectedUsersCount: z.ZodDefault<z.ZodNumber>;
    deletedBy: z.ZodOptional<z.ZodString>;
    deletedAt: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    roleId: z.ZodString;
    roleName: z.ZodOptional<z.ZodString>;
    transferredToRoleId: z.ZodOptional<z.ZodString>;
    affectedUsersCount: z.ZodDefault<z.ZodNumber>;
    deletedBy: z.ZodOptional<z.ZodString>;
    deletedAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    roleId: z.ZodString;
    roleName: z.ZodOptional<z.ZodString>;
    transferredToRoleId: z.ZodOptional<z.ZodString>;
    affectedUsersCount: z.ZodDefault<z.ZodNumber>;
    deletedBy: z.ZodOptional<z.ZodString>;
    deletedAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export declare const RoleAssignedPayload: z.ZodObject<{
    assignmentId: z.ZodString;
    roleId: z.ZodString;
    userId: z.ZodString;
    entityId: z.ZodOptional<z.ZodString>;
    assignedAt: z.ZodString;
    assignedBy: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    assignmentId: z.ZodString;
    roleId: z.ZodString;
    userId: z.ZodString;
    entityId: z.ZodOptional<z.ZodString>;
    assignedAt: z.ZodString;
    assignedBy: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    assignmentId: z.ZodString;
    roleId: z.ZodString;
    userId: z.ZodString;
    entityId: z.ZodOptional<z.ZodString>;
    assignedAt: z.ZodString;
    assignedBy: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const RoleUnassignedPayload: z.ZodObject<{
    assignmentId: z.ZodString;
    roleId: z.ZodString;
    userId: z.ZodString;
    unassignedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    assignmentId: z.ZodString;
    roleId: z.ZodString;
    userId: z.ZodString;
    unassignedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    assignmentId: z.ZodString;
    roleId: z.ZodString;
    userId: z.ZodString;
    unassignedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const CreditAllocatedPayload: z.ZodObject<{
    entityId: z.ZodString;
    deltaAmount: z.ZodNumber;
    allocationId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    allocatedAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    deltaAmount: z.ZodNumber;
    allocationId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    allocatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    deltaAmount: z.ZodNumber;
    allocationId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    allocatedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const CreditConsumedPayload: z.ZodObject<{
    entityId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    operationType: z.ZodString;
    operationId: z.ZodOptional<z.ZodString>;
    consumedAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    operationType: z.ZodString;
    operationId: z.ZodOptional<z.ZodString>;
    consumedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    operationType: z.ZodString;
    operationId: z.ZodOptional<z.ZodString>;
    consumedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const CreditRevokedPayload: z.ZodObject<{
    entityId: z.ZodString;
    revokedAmount: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodString;
    revokedBy: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    revokedAmount: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodString;
    revokedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    revokedAmount: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodString;
    revokedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const CreditExpiredPayload: z.ZodObject<{
    entityId: z.ZodString;
    expiredAmount: z.ZodNumber;
    expiredAt: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    expiredAmount: z.ZodNumber;
    expiredAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    expiredAmount: z.ZodNumber;
    expiredAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export declare const CreditConfigUpdatedPayload: z.ZodObject<{
    entityId: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    updatedAt: z.ZodString;
    updatedBy: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    updatedAt: z.ZodString;
    updatedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    updatedAt: z.ZodString;
    updatedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const SubscriptionCancelScheduledPayload: z.ZodObject<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const SubscriptionCanceledPayload: z.ZodObject<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const SubscriptionUpgradedPayload: z.ZodObject<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const SubscriptionExpiredPayload: z.ZodObject<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const SubscriptionRenewedPayload: z.ZodObject<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TenantOnboardedPayload: z.ZodObject<{
    tenantId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    plan: z.ZodOptional<z.ZodString>;
    onboardedAt: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    tenantId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    plan: z.ZodOptional<z.ZodString>;
    onboardedAt: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    tenantId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    plan: z.ZodOptional<z.ZodString>;
    onboardedAt: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TenantBootstrappedPayload: z.ZodObject<{
    tenantId: z.ZodString;
    bootstrappedAt: z.ZodOptional<z.ZodString>;
    enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    tenantId: z.ZodString;
    bootstrappedAt: z.ZodOptional<z.ZodString>;
    enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    tenantId: z.ZodString;
    bootstrappedAt: z.ZodOptional<z.ZodString>;
    enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TenantDeletedPayload: z.ZodObject<{
    tenantId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    tenantId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    tenantId: z.ZodString;
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TenantAppProvisionedPayload: z.ZodObject<{
    tenantId: z.ZodString;
    appCode: z.ZodString;
    provisionedAt: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    tenantId: z.ZodString;
    appCode: z.ZodString;
    provisionedAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    tenantId: z.ZodString;
    appCode: z.ZodString;
    provisionedAt: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export declare const TenantAppDeprovisionedPayload: z.ZodObject<{
    tenantId: z.ZodString;
    appCode: z.ZodString;
    deprovisionedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    tenantId: z.ZodString;
    appCode: z.ZodString;
    deprovisionedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    tenantId: z.ZodString;
    appCode: z.ZodString;
    deprovisionedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TenantApplicationsUpdatedPayload: z.ZodObject<{
    tenantId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    applications: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    tenantId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    applications: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    tenantId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    applications: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export declare const ConfigurationUpdatedPayload: z.ZodObject<{
    scope: z.ZodString;
    key: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodString;
    updatedBy: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    scope: z.ZodString;
    key: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodString;
    updatedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    scope: z.ZodString;
    key: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodUnknown>;
    updatedAt: z.ZodString;
    updatedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const AccountingEntityProvisionRequestedPayload: z.ZodObject<{
    entityId: z.ZodString;
    appCode: z.ZodDefault<z.ZodString>;
    requestedAt: z.ZodOptional<z.ZodString>;
    requestedBy: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    entityId: z.ZodString;
    appCode: z.ZodDefault<z.ZodString>;
    requestedAt: z.ZodOptional<z.ZodString>;
    requestedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    entityId: z.ZodString;
    appCode: z.ZodDefault<z.ZodString>;
    requestedAt: z.ZodOptional<z.ZodString>;
    requestedBy: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const EVENT_REGISTRY: {
    readonly 'user.created': z.ZodObject<{
        userId: z.ZodString;
        email: z.ZodString;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
        kindeUserId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        userId: z.ZodString;
        email: z.ZodString;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
        kindeUserId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        userId: z.ZodString;
        email: z.ZodString;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
        kindeUserId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'user.updated': z.ZodObject<{
        userId: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        userId: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        userId: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'user.deactivated': z.ZodObject<{
        userId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        userId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        userId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'user.deleted': z.ZodObject<{
        userId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        userId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        userId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'user.invitation.accepted': z.ZodObject<{
        userId: z.ZodString;
        email: z.ZodString;
        invitationId: z.ZodOptional<z.ZodString>;
        acceptedAt: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        userId: z.ZodString;
        email: z.ZodString;
        invitationId: z.ZodOptional<z.ZodString>;
        acceptedAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        userId: z.ZodString;
        email: z.ZodString;
        invitationId: z.ZodOptional<z.ZodString>;
        acceptedAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'user.session.revoked': z.ZodObject<{
        userId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        jti: z.ZodOptional<z.ZodString>;
        revokedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        userId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        jti: z.ZodOptional<z.ZodString>;
        revokedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        userId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        jti: z.ZodOptional<z.ZodString>;
        revokedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'entity.created': z.ZodObject<{
        entityId: z.ZodString;
        name: z.ZodString;
        type: z.ZodOptional<z.ZodString>;
        organizationId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        name: z.ZodString;
        type: z.ZodOptional<z.ZodString>;
        organizationId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        name: z.ZodString;
        type: z.ZodOptional<z.ZodString>;
        organizationId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'entity.updated': z.ZodObject<{
        entityId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'entity.deleted': z.ZodObject<{
        entityId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'entity.deactivated': z.ZodObject<{
        entityId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.created': z.ZodObject<{
        organizationId: z.ZodString;
        name: z.ZodString;
        parentEntityId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        organizationId: z.ZodString;
        name: z.ZodString;
        parentEntityId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        organizationId: z.ZodString;
        name: z.ZodString;
        parentEntityId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.updated': z.ZodObject<{
        organizationId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        organizationId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        organizationId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.deleted': z.ZodObject<{
        organizationId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        organizationId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        organizationId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.deactivated': z.ZodObject<{
        organizationId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        organizationId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        organizationId: z.ZodString;
        deactivatedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.assignment.created': z.ZodObject<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.assignment.added': z.ZodObject<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.assignment.updated': z.ZodObject<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.assignment.changed': z.ZodObject<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        roleId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.assignment.deleted': z.ZodObject<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        removedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        removedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        removedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.assignment.deactivated': z.ZodObject<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        removedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        removedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assignmentId: z.ZodString;
        organizationId: z.ZodString;
        userId: z.ZodString;
        removedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.assigned': z.ZodObject<{
        organizationId: z.ZodString;
        userId: z.ZodString;
        assignedAt: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        organizationId: z.ZodString;
        userId: z.ZodString;
        assignedAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        organizationId: z.ZodString;
        userId: z.ZodString;
        assignedAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'organization.unassigned': z.ZodObject<{
        organizationId: z.ZodString;
        userId: z.ZodString;
        unassignedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        organizationId: z.ZodString;
        userId: z.ZodString;
        unassignedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        organizationId: z.ZodString;
        userId: z.ZodString;
        unassignedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'role.created': z.ZodObject<{
        roleId: z.ZodString;
        roleName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        roleId: z.ZodString;
        roleName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        roleId: z.ZodString;
        roleName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'role.updated': z.ZodObject<{
        roleId: z.ZodString;
        roleName: z.ZodOptional<z.ZodString>;
        permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        roleId: z.ZodString;
        roleName: z.ZodOptional<z.ZodString>;
        permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        roleId: z.ZodString;
        roleName: z.ZodOptional<z.ZodString>;
        permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'role.deleted': z.ZodObject<{
        roleId: z.ZodString;
        roleName: z.ZodOptional<z.ZodString>;
        transferredToRoleId: z.ZodOptional<z.ZodString>;
        affectedUsersCount: z.ZodDefault<z.ZodNumber>;
        deletedBy: z.ZodOptional<z.ZodString>;
        deletedAt: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        roleId: z.ZodString;
        roleName: z.ZodOptional<z.ZodString>;
        transferredToRoleId: z.ZodOptional<z.ZodString>;
        affectedUsersCount: z.ZodDefault<z.ZodNumber>;
        deletedBy: z.ZodOptional<z.ZodString>;
        deletedAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        roleId: z.ZodString;
        roleName: z.ZodOptional<z.ZodString>;
        transferredToRoleId: z.ZodOptional<z.ZodString>;
        affectedUsersCount: z.ZodDefault<z.ZodNumber>;
        deletedBy: z.ZodOptional<z.ZodString>;
        deletedAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'role.assigned': z.ZodObject<{
        assignmentId: z.ZodString;
        roleId: z.ZodString;
        userId: z.ZodString;
        entityId: z.ZodOptional<z.ZodString>;
        assignedAt: z.ZodString;
        assignedBy: z.ZodOptional<z.ZodString>;
        expiresAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assignmentId: z.ZodString;
        roleId: z.ZodString;
        userId: z.ZodString;
        entityId: z.ZodOptional<z.ZodString>;
        assignedAt: z.ZodString;
        assignedBy: z.ZodOptional<z.ZodString>;
        expiresAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assignmentId: z.ZodString;
        roleId: z.ZodString;
        userId: z.ZodString;
        entityId: z.ZodOptional<z.ZodString>;
        assignedAt: z.ZodString;
        assignedBy: z.ZodOptional<z.ZodString>;
        expiresAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'role.unassigned': z.ZodObject<{
        assignmentId: z.ZodString;
        roleId: z.ZodString;
        userId: z.ZodString;
        unassignedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assignmentId: z.ZodString;
        roleId: z.ZodString;
        userId: z.ZodString;
        unassignedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assignmentId: z.ZodString;
        roleId: z.ZodString;
        userId: z.ZodString;
        unassignedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'credit.allocated': z.ZodObject<{
        entityId: z.ZodString;
        deltaAmount: z.ZodNumber;
        allocationId: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
        allocatedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        deltaAmount: z.ZodNumber;
        allocationId: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
        allocatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        deltaAmount: z.ZodNumber;
        allocationId: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
        allocatedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'credit.consumed': z.ZodObject<{
        entityId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        amount: z.ZodNumber;
        operationType: z.ZodString;
        operationId: z.ZodOptional<z.ZodString>;
        consumedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        amount: z.ZodNumber;
        operationType: z.ZodString;
        operationId: z.ZodOptional<z.ZodString>;
        consumedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        amount: z.ZodNumber;
        operationType: z.ZodString;
        operationId: z.ZodOptional<z.ZodString>;
        consumedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'credit.revoked': z.ZodObject<{
        entityId: z.ZodString;
        revokedAmount: z.ZodNumber;
        reason: z.ZodOptional<z.ZodString>;
        revokedAt: z.ZodString;
        revokedBy: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        revokedAmount: z.ZodNumber;
        reason: z.ZodOptional<z.ZodString>;
        revokedAt: z.ZodString;
        revokedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        revokedAmount: z.ZodNumber;
        reason: z.ZodOptional<z.ZodString>;
        revokedAt: z.ZodString;
        revokedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'credit.expired': z.ZodObject<{
        entityId: z.ZodString;
        expiredAmount: z.ZodNumber;
        expiredAt: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        expiredAmount: z.ZodNumber;
        expiredAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        expiredAmount: z.ZodNumber;
        expiredAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'credit.config.updated': z.ZodObject<{
        entityId: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedAt: z.ZodString;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedAt: z.ZodString;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedAt: z.ZodString;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'subscription.cancel_scheduled': z.ZodObject<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'subscription.canceled': z.ZodObject<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'subscription.upgraded': z.ZodObject<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'subscription.expired': z.ZodObject<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'subscription.renewed': z.ZodObject<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        plan: z.ZodString;
        oldPlan: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        effectiveDate: z.ZodOptional<z.ZodString>;
        cancelAt: z.ZodOptional<z.ZodString>;
        renewalDate: z.ZodOptional<z.ZodString>;
        nextBillingDate: z.ZodOptional<z.ZodString>;
        isTrialUser: z.ZodOptional<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'tenant.onboarded': z.ZodObject<{
        tenantId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        plan: z.ZodOptional<z.ZodString>;
        onboardedAt: z.ZodOptional<z.ZodString>;
        snapshot: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        tenantId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        plan: z.ZodOptional<z.ZodString>;
        onboardedAt: z.ZodOptional<z.ZodString>;
        snapshot: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        tenantId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        plan: z.ZodOptional<z.ZodString>;
        onboardedAt: z.ZodOptional<z.ZodString>;
        snapshot: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'tenant.bootstrapped': z.ZodObject<{
        tenantId: z.ZodString;
        bootstrappedAt: z.ZodOptional<z.ZodString>;
        enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        tenantId: z.ZodString;
        bootstrappedAt: z.ZodOptional<z.ZodString>;
        enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        tenantId: z.ZodString;
        bootstrappedAt: z.ZodOptional<z.ZodString>;
        enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'tenant.deleted': z.ZodObject<{
        tenantId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        tenantId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        tenantId: z.ZodString;
        deletedAt: z.ZodString;
        deletedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'tenant.app.provisioned': z.ZodObject<{
        tenantId: z.ZodString;
        appCode: z.ZodString;
        provisionedAt: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        tenantId: z.ZodString;
        appCode: z.ZodString;
        provisionedAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        tenantId: z.ZodString;
        appCode: z.ZodString;
        provisionedAt: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'tenant.app.deprovisioned': z.ZodObject<{
        tenantId: z.ZodString;
        appCode: z.ZodString;
        deprovisionedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        tenantId: z.ZodString;
        appCode: z.ZodString;
        deprovisionedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        tenantId: z.ZodString;
        appCode: z.ZodString;
        deprovisionedAt: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'tenant.applications.updated': z.ZodObject<{
        tenantId: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        applications: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        tenantId: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        applications: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        tenantId: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        applications: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        enabledAppCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'configuration.updated': z.ZodObject<{
        scope: z.ZodString;
        key: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodUnknown>;
        updatedAt: z.ZodString;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        scope: z.ZodString;
        key: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodUnknown>;
        updatedAt: z.ZodString;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        scope: z.ZodString;
        key: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodUnknown>;
        updatedAt: z.ZodString;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    readonly 'accounting.entity.provision.requested': z.ZodObject<{
        entityId: z.ZodString;
        appCode: z.ZodDefault<z.ZodString>;
        requestedAt: z.ZodOptional<z.ZodString>;
        requestedBy: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        entityId: z.ZodString;
        appCode: z.ZodDefault<z.ZodString>;
        requestedAt: z.ZodOptional<z.ZodString>;
        requestedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        entityId: z.ZodString;
        appCode: z.ZodDefault<z.ZodString>;
        requestedAt: z.ZodOptional<z.ZodString>;
        requestedBy: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
};
export type EventType = keyof typeof EVENT_REGISTRY;
/** Type-level lookup of a payload type from its event type string. */
export type PayloadOf<E extends EventType> = z.infer<(typeof EVENT_REGISTRY)[E]>;
/** Returns true if the given string is a known event type in the registry. */
export declare function isKnownEventType(eventType: string): eventType is EventType;
export type ValidateEventResult<E extends EventType = EventType> = {
    success: true;
    data: PayloadOf<E>;
} | {
    success: false;
    error: string;
};
/**
 * Validate a payload against the schema registered for the given event type.
 *
 * Returns a discriminated `{ success: true, data } | { success: false, error }`
 * so callers can branch without try/catch. Returns `{ success: false }` with
 * an explanatory message if the event type is unknown.
 */
export declare function validateEvent<E extends EventType>(eventType: E, payload: unknown): ValidateEventResult<E>;
export declare function validateEvent(eventType: string, payload: unknown): ValidateEventResult;
//# sourceMappingURL=registry.d.ts.map