import { proxyActivities } from '@temporalio/workflow';
import { ACTIVITY_OPTIONS } from '../retry-policies';

/**
 * Payroll Journal Entry Saga (ADR-014).
 *
 * Triggered when HRMS publishes hrms.payroll.processed.
 * Orchestrates posting of journal entries to FA and marking payroll settled in HRMS.
 *
 * Forward path:
 *   1. FA posts salary expense journal entries (debit Salary Expense / credit Salaries Payable)
 *   2. FA processes the payroll payment (debit Salaries Payable / credit Bank)
 *   3. HRMS marks payroll run as settled
 *
 * Compensation:
 *   Step 2 fails → FA reverses the journal entries from step 1
 */

export interface PayrollJournalEntrySagaInput {
  tenantId: string;
  correlationId: string;
  payrollRunId: string;
  payrollPeriod: { start: string; end: string };
  totalGrossPay: number;
  totalNetPay: number;
  totalTaxWithheld: number;
  totalDeductions: number;
  currency: string;
  costCenterId?: string;
  journalEntryInstructions: Array<{
    accountCode: string;
    description: string;
    debit?: number;
    credit?: number;
    costCenterId?: string;
  }>;
}

interface PayrollActivities {
  postPayrollJournalEntries(input: PayrollJournalEntrySagaInput): Promise<string>;
  reversePayrollJournalEntries(input: { tenantId: string; journalBatchId: string; reason: string }): Promise<void>;
  processPayrollPayment(input: { tenantId: string; payrollRunId: string; journalBatchId: string; amount: number; currency: string }): Promise<void>;
  markPayrollSettled(input: { tenantId: string; payrollRunId: string }): Promise<void>;
}

const fa = proxyActivities<Pick<PayrollActivities, 'postPayrollJournalEntries' | 'reversePayrollJournalEntries' | 'processPayrollPayment'>>(
  ACTIVITY_OPTIONS.faJournal,
);
const hrms = proxyActivities<Pick<PayrollActivities, 'markPayrollSettled'>>(
  ACTIVITY_OPTIONS.hrms,
);

export async function payrollJournalEntrySaga(input: PayrollJournalEntrySagaInput): Promise<void> {
  // Step 1: Post journal entries (debit expense accounts / credit payable)
  let journalBatchId: string;
  try {
    journalBatchId = await fa.postPayrollJournalEntries(input);
  } catch (err) {
    throw err;
  }

  // Step 2: Process payment (debit payable / credit bank) — compensate by reversing if fails
  try {
    await fa.processPayrollPayment({
      tenantId: input.tenantId,
      payrollRunId: input.payrollRunId,
      journalBatchId,
      amount: input.totalNetPay,
      currency: input.currency,
    });
  } catch (err) {
    await fa.reversePayrollJournalEntries({
      tenantId: input.tenantId,
      journalBatchId,
      reason: 'Payment processing failed — saga compensation',
    });
    throw err;
  }

  // Step 3: Mark payroll settled in HRMS
  await hrms.markPayrollSettled({ tenantId: input.tenantId, payrollRunId: input.payrollRunId });
}
