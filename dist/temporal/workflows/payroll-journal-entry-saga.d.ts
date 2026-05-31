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
    payrollPeriod: {
        start: string;
        end: string;
    };
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
export declare function payrollJournalEntrySaga(input: PayrollJournalEntrySagaInput): Promise<void>;
//# sourceMappingURL=payroll-journal-entry-saga.d.ts.map