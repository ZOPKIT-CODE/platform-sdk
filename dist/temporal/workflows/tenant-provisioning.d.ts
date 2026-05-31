/**
 * Tenant Provisioning Workflow (ADR-019).
 *
 * Triggered when Wrapper publishes tenant.onboarded. Provisions the tenant
 * across all apps via dedicated per-app task queues, then opens the
 * inter-app EventBridge gate once every app confirms readiness.
 *
 * Idempotency: workflowId = `tenant-provision-${kindeOrgId}`
 * Duplicate starts are rejected by Temporal — no manual dedup needed.
 *
 * DETERMINISM RULES: No Date.now(), Math.random(), or I/O in this file.
 */
export interface ProvisioningSnapshot {
    tenantId: string;
    kindeOrgId: string;
    tenantName: string;
    plan?: string;
    onboardingProfile?: {
        industry?: string;
        primaryUseCase?: string;
        companySize?: string;
    };
    users?: unknown[];
    roles?: unknown[];
    organizations?: unknown[];
    roleAssignments?: unknown[];
    creditConfigs?: unknown[];
    entityCredits?: unknown[];
}
export declare function tenantProvisioningWorkflow(snapshot: ProvisioningSnapshot): Promise<void>;
//# sourceMappingURL=tenant-provisioning.d.ts.map