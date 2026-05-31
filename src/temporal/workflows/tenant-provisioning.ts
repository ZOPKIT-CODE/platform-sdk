import { proxyActivities } from '@temporalio/workflow';
import {
  LOOKUP_RETRY,
  CRM_MUTATION_RETRY,
  FA_JOURNAL_RETRY,
  HRMS_RETRY,
  PM_RETRY,
  NOTIFICATION_RETRY,
} from '../retry-policies';

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

// ── Per-app activity interfaces ───────────────────────────────────────────────

interface CrmActivities {
  provisionCrmTenant(snapshot: ProvisioningSnapshot): Promise<void>;
  markCrmTenantLive(kindeOrgId: string): Promise<void>;
}

interface FaActivities {
  provisionFaTenant(snapshot: ProvisioningSnapshot): Promise<void>;
  markFaTenantLive(kindeOrgId: string): Promise<void>;
}

interface HrmsActivities {
  provisionHrmsTenant(snapshot: ProvisioningSnapshot): Promise<void>;
}

interface PmActivities {
  provisionPmTenant(snapshot: ProvisioningSnapshot): Promise<void>;
}

// ── Per-app activity proxies — each routes to its own task queue ──────────────

const crm = proxyActivities<CrmActivities>({
  startToCloseTimeout: '30s',
  retry: CRM_MUTATION_RETRY,
  taskQueue: 'crm-activities',
});

const fa = proxyActivities<FaActivities>({
  startToCloseTimeout: '60s',
  retry: FA_JOURNAL_RETRY,
  taskQueue: 'fa-activities',
});

const hrms = proxyActivities<HrmsActivities>({
  startToCloseTimeout: '30s',
  retry: HRMS_RETRY,
  taskQueue: 'hrms-activities',
});

const pm = proxyActivities<PmActivities>({
  startToCloseTimeout: '30s',
  retry: PM_RETRY,
  taskQueue: 'pm-activities',
});

// ── Workflow ──────────────────────────────────────────────────────────────────

export async function tenantProvisioningWorkflow(snapshot: ProvisioningSnapshot): Promise<void> {
  // Phase 1: Provision all apps in parallel — each is independent and idempotent.
  await Promise.all([
    crm.provisionCrmTenant(snapshot),
    fa.provisionFaTenant(snapshot),
    hrms.provisionHrmsTenant(snapshot),
    pm.provisionPmTenant(snapshot),
  ]);

  // Phase 2: Open the inter-app EventBridge gate.
  // Both marks must succeed before any cross-app events are published.
  // Running them in parallel is safe — each app gates only on its own flag.
  await Promise.all([
    crm.markCrmTenantLive(snapshot.kindeOrgId),
    fa.markFaTenantLive(snapshot.kindeOrgId),
  ]);
}
