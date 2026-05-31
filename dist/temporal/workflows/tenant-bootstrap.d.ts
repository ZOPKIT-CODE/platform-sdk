/**
 * Tenant Bootstrap Workflow — MQ-driven path (ADR-019 addendum).
 *
 * Triggered by the SQS consumer when tenant.onboarded arrives with an
 * embedded or claim-check-resolved snapshot.  The SQS handler does only
 * pre-flight work (lock acquisition, snapshot persistence) and immediately
 * starts this workflow — giving the long-running sync durability, observability,
 * and automatic retry without blocking the SQS consumer thread.
 *
 * Sequence:
 *   1. bootstrapFromSnapshot — writes snapshot data into FA tables via syncFromSnapshot.
 *   2. completeTenantBootstrap — transitions tenant to mq_only, records audit rows.
 *   3. replayTenantBufferedEvents — re-processes incremental SQS events buffered during
 *      the bootstrap window, in strict arrival order.
 *
 * Idempotency: workflowId = `tenant-bootstrap-{tenantId}-{mqEventId}`
 * Duplicate starts (SQS re-deliver) are rejected by Temporal — no manual dedup needed.
 *
 * DETERMINISM RULES: No Date.now(), Math.random(), or I/O in this file.
 */
export interface TenantBootstrapInput {
    tenantId: string;
    mqEventId: string;
    syncRunId: string;
    snapshot: {
        tenant?: unknown;
        wrapperEntities?: unknown[];
        users?: unknown[];
        roles?: unknown[];
        employeeAssignments?: unknown[];
        roleAssignments?: unknown[];
        creditConfigs?: unknown[];
        entityCredits?: unknown[];
    };
    plan?: string;
    enabledModules?: string[];
    expiresAt?: string;
}
export interface BootstrapFromSnapshotResult {
    success: boolean;
    stats: Record<string, number>;
    errors?: string[];
}
export declare function tenantBootstrapWorkflow(input: TenantBootstrapInput): Promise<void>;
//# sourceMappingURL=tenant-bootstrap.d.ts.map