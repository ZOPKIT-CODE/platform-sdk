import { proxyActivities } from '@temporalio/workflow';
import { ACTIVITY_OPTIONS } from '../retry-policies';

/**
 * Employee Offboarding Workflow (ADR-014).
 *
 * Triggered when HRMS publishes hrms.employee.terminated.
 * Coordinates deallocation across PM, CRM, and final settlement in FA.
 *
 * Steps:
 *   1. Parallel: PM deallocates employee + CRM revokes client access
 *   2. HRMS computes final settlement
 *   3. FA posts termination journal entry
 *   4. HRMS marks settlement complete
 */

export interface EmployeeOffboardingInput {
  tenantId: string;
  correlationId: string;
  employeeId: string;
  terminationDate: string;
  terminationType: 'voluntary' | 'involuntary' | 'retirement';
  finalSettlementAmount?: number;
  currency: string;
}

interface OffboardingActivities {
  deallocateEmployeeFromProjects(input: { tenantId: string; employeeId: string; terminationDate: string }): Promise<void>;
  revokeCrmClientAccess(input: { tenantId: string; employeeId: string }): Promise<void>;
  computeFinalSettlement(input: { tenantId: string; employeeId: string; terminationDate: string; terminationType: string }): Promise<number>;
  postTerminationJournalEntry(input: { tenantId: string; employeeId: string; amount: number; currency: string; correlationId: string }): Promise<void>;
  markSettlementComplete(input: { tenantId: string; employeeId: string }): Promise<void>;
}

const pm = proxyActivities<Pick<OffboardingActivities, 'deallocateEmployeeFromProjects'>>(
  ACTIVITY_OPTIONS.pm,
);
const crm = proxyActivities<Pick<OffboardingActivities, 'revokeCrmClientAccess'>>(
  ACTIVITY_OPTIONS.crmMutation,
);
const hrms = proxyActivities<Pick<OffboardingActivities, 'computeFinalSettlement' | 'markSettlementComplete'>>(
  ACTIVITY_OPTIONS.hrms,
);
const fa = proxyActivities<Pick<OffboardingActivities, 'postTerminationJournalEntry'>>(
  ACTIVITY_OPTIONS.faJournal,
);

export async function employeeOffboardingWorkflow(
  input: EmployeeOffboardingInput,
): Promise<void> {
  // Step 1: Parallel cleanup — order doesn't matter
  await Promise.all([
    pm.deallocateEmployeeFromProjects({
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      terminationDate: input.terminationDate,
    }),
    crm.revokeCrmClientAccess({
      tenantId: input.tenantId,
      employeeId: input.employeeId,
    }),
  ]);

  // Step 2: Compute final settlement (HRMS is SoR for this)
  const settlementAmount = await hrms.computeFinalSettlement({
    tenantId: input.tenantId,
    employeeId: input.employeeId,
    terminationDate: input.terminationDate,
    terminationType: input.terminationType,
  });

  // Step 3: Post termination journal entry in FA
  await fa.postTerminationJournalEntry({
    tenantId: input.tenantId,
    employeeId: input.employeeId,
    amount: settlementAmount,
    currency: input.currency,
    correlationId: input.correlationId,
  });

  // Step 4: Mark settlement complete in HRMS
  await hrms.markSettlementComplete({
    tenantId: input.tenantId,
    employeeId: input.employeeId,
  });
}
