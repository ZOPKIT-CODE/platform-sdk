import { proxyActivities } from '@temporalio/workflow';
import { FA_JOURNAL_RETRY } from '../retry-policies';

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

interface FaBootstrapActivities {
  bootstrapFromSnapshot(input: {
    tenantId: string;
    snapshot: TenantBootstrapInput['snapshot'];
    syncRunId: string;
    plan?: string;
    enabledModules?: string[];
    expiresAt?: string;
  }): Promise<BootstrapFromSnapshotResult>;

  completeTenantBootstrap(input: {
    tenantId: string;
    mqEventId: string;
    syncRunId: string;
    stats: Record<string, number>;
    plan?: string;
  }): Promise<void>;

  failTenantBootstrap(input: {
    tenantId: string;
    mqEventId: string;
    syncRunId: string;
    errors: string[];
  }): Promise<void>;

  replayTenantBufferedEvents(input: {
    tenantId: string;
  }): Promise<{ replayed: number; failed: number }>;
}

const fa = proxyActivities<FaBootstrapActivities>({
  // Bootstrap can run 30-60s for large snapshots. Give generous headroom.
  startToCloseTimeout: '10m',
  retry: {
    ...FA_JOURNAL_RETRY,
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['ValidationError'],
  },
  taskQueue: 'fa-activities',
});

export async function tenantBootstrapWorkflow(input: TenantBootstrapInput): Promise<void> {
  // Phase 1: Sync snapshot data into FA tables.
  const result = await fa.bootstrapFromSnapshot({
    tenantId: input.tenantId,
    snapshot: input.snapshot,
    syncRunId: input.syncRunId,
    plan: input.plan,
    enabledModules: input.enabledModules,
    expiresAt: input.expiresAt,
  });

  if (!result.success) {
    // Record failure and release the sync lock so re-delivery can retry.
    await fa.failTenantBootstrap({
      tenantId: input.tenantId,
      mqEventId: input.mqEventId,
      syncRunId: input.syncRunId,
      errors: result.errors ?? ['syncFromSnapshot returned success=false'],
    });
    return;
  }

  // Phase 2: Transition to mq_only, mark snapshot processed, record audit rows.
  await fa.completeTenantBootstrap({
    tenantId: input.tenantId,
    mqEventId: input.mqEventId,
    syncRunId: input.syncRunId,
    stats: result.stats,
    plan: input.plan,
  });

  // Phase 3: Replay incremental SQS events buffered during the bootstrap window.
  await fa.replayTenantBufferedEvents({ tenantId: input.tenantId });
}
