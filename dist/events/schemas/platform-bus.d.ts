import { z } from 'zod';
export declare const TenantOnboardedPayload: z.ZodObject<{
    snapshot: z.ZodObject<{
        tenant: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            kindeOrgId: z.ZodString;
            plan: z.ZodOptional<z.ZodString>;
            subscription: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            kindeOrgId: string;
            plan?: string | undefined;
            subscription?: Record<string, unknown> | undefined;
        }, {
            name: string;
            id: string;
            kindeOrgId: string;
            plan?: string | undefined;
            subscription?: Record<string, unknown> | undefined;
        }>;
        organizations: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        users: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        roles: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        roleAssignments: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        creditConfigs: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        entityCredits: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        onboardingProfile: z.ZodOptional<z.ZodObject<{
            primaryUseCase: z.ZodOptional<z.ZodString>;
            industry: z.ZodOptional<z.ZodString>;
            companySize: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            primaryUseCase?: string | undefined;
            industry?: string | undefined;
            companySize?: string | undefined;
        }, {
            primaryUseCase?: string | undefined;
            industry?: string | undefined;
            companySize?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        tenant: {
            name: string;
            id: string;
            kindeOrgId: string;
            plan?: string | undefined;
            subscription?: Record<string, unknown> | undefined;
        };
        organizations: Record<string, unknown>[];
        users: Record<string, unknown>[];
        roles: Record<string, unknown>[];
        roleAssignments: Record<string, unknown>[];
        creditConfigs: Record<string, unknown>[];
        entityCredits: Record<string, unknown>[];
        onboardingProfile?: {
            primaryUseCase?: string | undefined;
            industry?: string | undefined;
            companySize?: string | undefined;
        } | undefined;
    }, {
        tenant: {
            name: string;
            id: string;
            kindeOrgId: string;
            plan?: string | undefined;
            subscription?: Record<string, unknown> | undefined;
        };
        organizations?: Record<string, unknown>[] | undefined;
        users?: Record<string, unknown>[] | undefined;
        roles?: Record<string, unknown>[] | undefined;
        roleAssignments?: Record<string, unknown>[] | undefined;
        creditConfigs?: Record<string, unknown>[] | undefined;
        entityCredits?: Record<string, unknown>[] | undefined;
        onboardingProfile?: {
            primaryUseCase?: string | undefined;
            industry?: string | undefined;
            companySize?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    snapshot: {
        tenant: {
            name: string;
            id: string;
            kindeOrgId: string;
            plan?: string | undefined;
            subscription?: Record<string, unknown> | undefined;
        };
        organizations: Record<string, unknown>[];
        users: Record<string, unknown>[];
        roles: Record<string, unknown>[];
        roleAssignments: Record<string, unknown>[];
        creditConfigs: Record<string, unknown>[];
        entityCredits: Record<string, unknown>[];
        onboardingProfile?: {
            primaryUseCase?: string | undefined;
            industry?: string | undefined;
            companySize?: string | undefined;
        } | undefined;
    };
}, {
    snapshot: {
        tenant: {
            name: string;
            id: string;
            kindeOrgId: string;
            plan?: string | undefined;
            subscription?: Record<string, unknown> | undefined;
        };
        organizations?: Record<string, unknown>[] | undefined;
        users?: Record<string, unknown>[] | undefined;
        roles?: Record<string, unknown>[] | undefined;
        roleAssignments?: Record<string, unknown>[] | undefined;
        creditConfigs?: Record<string, unknown>[] | undefined;
        entityCredits?: Record<string, unknown>[] | undefined;
        onboardingProfile?: {
            primaryUseCase?: string | undefined;
            industry?: string | undefined;
            companySize?: string | undefined;
        } | undefined;
    };
}>;
export declare const TenantAppProvisionedPayload: z.ZodObject<{
    appCode: z.ZodString;
    provisionedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    appCode: string;
    provisionedAt: string;
}, {
    appCode: string;
    provisionedAt: string;
}>;
export declare const TenantApplicationsUpdatedPayload: z.ZodObject<{
    reason: z.ZodString;
    applications: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
    enabledAppCodes: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    reason: string;
    applications: Record<string, unknown>[];
    enabledAppCodes: string[];
}, {
    reason: string;
    applications: Record<string, unknown>[];
    enabledAppCodes: string[];
}>;
export declare const TenantDeletedPayload: z.ZodObject<{
    deletedAt: z.ZodString;
    deletedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    deletedAt: string;
    deletedBy?: string | undefined;
}, {
    deletedAt: string;
    deletedBy?: string | undefined;
}>;
export declare const UserPayload: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
} & {
    email: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    kindeUserId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    isActive: boolean;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    kindeUserId?: string | undefined;
}, {
    id: string;
    email: string;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    isActive?: boolean | undefined;
    kindeUserId?: string | undefined;
}>;
export declare const UserDeactivatedPayload: z.ZodObject<{
    userId: z.ZodString;
    deactivatedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    deactivatedAt: string;
    reason?: string | undefined;
}, {
    userId: string;
    deactivatedAt: string;
    reason?: string | undefined;
}>;
export declare const UserSessionRevokedPayload: z.ZodObject<{
    userId: z.ZodString;
    revokedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    revokedAt: string;
    reason?: string | undefined;
}, {
    userId: string;
    revokedAt: string;
    reason?: string | undefined;
}>;
export declare const RolePayload: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
} & {
    roleName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    restrictions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    roleName: string;
    permissions: string[];
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
    restrictions?: Record<string, unknown> | undefined;
}, {
    id: string;
    roleName: string;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
    permissions?: string[] | undefined;
    restrictions?: Record<string, unknown> | undefined;
}>;
export declare const RoleDeletedPayload: z.ZodObject<{
    roleId: z.ZodString;
    roleName: z.ZodString;
    transferredToRoleId: z.ZodOptional<z.ZodString>;
    affectedUsersCount: z.ZodDefault<z.ZodNumber>;
    deletedBy: z.ZodOptional<z.ZodString>;
    deletedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    deletedAt: string;
    roleName: string;
    roleId: string;
    affectedUsersCount: number;
    deletedBy?: string | undefined;
    transferredToRoleId?: string | undefined;
}, {
    deletedAt: string;
    roleName: string;
    roleId: string;
    deletedBy?: string | undefined;
    transferredToRoleId?: string | undefined;
    affectedUsersCount?: number | undefined;
}>;
export declare const RoleAssignmentPayload: z.ZodObject<{
    assignmentId: z.ZodString;
    roleId: z.ZodString;
    userId: z.ZodString;
    assignedAt: z.ZodString;
    assignedBy: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    roleId: string;
    assignmentId: string;
    assignedAt: string;
    assignedBy?: string | undefined;
    expiresAt?: string | undefined;
    entityId?: string | undefined;
}, {
    userId: string;
    roleId: string;
    assignmentId: string;
    assignedAt: string;
    assignedBy?: string | undefined;
    expiresAt?: string | undefined;
    entityId?: string | undefined;
}>;
export declare const RoleUnassignedPayload: z.ZodObject<{
    assignmentId: z.ZodString;
    roleId: z.ZodString;
    userId: z.ZodString;
    unassignedAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    roleId: string;
    assignmentId: string;
    unassignedAt: string;
    reason?: string | undefined;
}, {
    userId: string;
    roleId: string;
    assignmentId: string;
    unassignedAt: string;
    reason?: string | undefined;
}>;
export declare const OrgAssignmentPayload: z.ZodObject<{
    assignmentId: z.ZodString;
    organizationId: z.ZodString;
    userId: z.ZodString;
    roleId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    assignmentId: string;
    organizationId: string;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    roleId?: string | undefined;
}, {
    userId: string;
    assignmentId: string;
    organizationId: string;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    roleId?: string | undefined;
}>;
export declare const SubscriptionUpdatedPayload: z.ZodObject<{
    plan: z.ZodString;
    oldPlan: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    effectiveDate: z.ZodOptional<z.ZodString>;
    cancelAt: z.ZodOptional<z.ZodString>;
    renewalDate: z.ZodOptional<z.ZodString>;
    nextBillingDate: z.ZodOptional<z.ZodString>;
    isTrialUser: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    plan: string;
    reason?: string | undefined;
    oldPlan?: string | undefined;
    effectiveDate?: string | undefined;
    cancelAt?: string | undefined;
    renewalDate?: string | undefined;
    nextBillingDate?: string | undefined;
    isTrialUser?: boolean | undefined;
}, {
    status: string;
    plan: string;
    reason?: string | undefined;
    oldPlan?: string | undefined;
    effectiveDate?: string | undefined;
    cancelAt?: string | undefined;
    renewalDate?: string | undefined;
    nextBillingDate?: string | undefined;
    isTrialUser?: boolean | undefined;
}>;
export declare const CreditAllocatedPayload: z.ZodObject<{
    entityId: z.ZodString;
    deltaAmount: z.ZodNumber;
    allocationId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entityId: string;
    deltaAmount: number;
    reason?: string | undefined;
    allocationId?: string | undefined;
}, {
    entityId: string;
    deltaAmount: number;
    reason?: string | undefined;
    allocationId?: string | undefined;
}>;
export declare const CreditConsumedPayload: z.ZodObject<{
    entityId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    operationType: z.ZodString;
    operationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entityId: string;
    amount: number;
    operationType: string;
    userId?: string | undefined;
    operationId?: string | undefined;
}, {
    entityId: string;
    amount: number;
    operationType: string;
    userId?: string | undefined;
    operationId?: string | undefined;
}>;
export declare const CreditExpiredPayload: z.ZodObject<{
    entityId: z.ZodString;
    expiredAmount: z.ZodNumber;
    expiredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    entityId: string;
    expiredAmount: number;
    expiredAt: string;
}, {
    entityId: string;
    expiredAmount: number;
    expiredAt: string;
}>;
export declare const CreditRevokedPayload: z.ZodObject<{
    entityId: z.ZodString;
    revokedAmount: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodString;
    revokedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    revokedAt: string;
    entityId: string;
    revokedAmount: number;
    reason?: string | undefined;
    revokedBy?: string | undefined;
}, {
    revokedAt: string;
    entityId: string;
    revokedAmount: number;
    reason?: string | undefined;
    revokedBy?: string | undefined;
}>;
export declare const AccountingEntityProvisionPayload: z.ZodObject<{
    entityId: z.ZodString;
    appCode: z.ZodDefault<z.ZodString>;
    provisionedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    appCode: string;
    entityId: string;
    provisionedAt?: string | undefined;
}, {
    entityId: string;
    appCode?: string | undefined;
    provisionedAt?: string | undefined;
}>;
export declare const PLATFORM_BUS_SCHEMAS: Record<string, z.ZodTypeAny>;
export type TenantOnboardedPayload = z.infer<typeof TenantOnboardedPayload>;
export type UserPayload = z.infer<typeof UserPayload>;
export type RolePayload = z.infer<typeof RolePayload>;
export type RoleAssignmentPayload = z.infer<typeof RoleAssignmentPayload>;
export type SubscriptionUpdatedPayload = z.infer<typeof SubscriptionUpdatedPayload>;
export type CreditAllocatedPayload = z.infer<typeof CreditAllocatedPayload>;
export type CreditRevokedPayload = z.infer<typeof CreditRevokedPayload>;
export type AccountingEntityProvisionPayload = z.infer<typeof AccountingEntityProvisionPayload>;
//# sourceMappingURL=platform-bus.d.ts.map