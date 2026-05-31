"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollJournalEntrySaga = payrollJournalEntrySaga;
const workflow_1 = require("@temporalio/workflow");
const retry_policies_1 = require("../retry-policies");
const fa = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.faJournal);
const hrms = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.hrms);
async function payrollJournalEntrySaga(input) {
    // Step 1: Post journal entries (debit expense accounts / credit payable)
    let journalBatchId;
    try {
        journalBatchId = await fa.postPayrollJournalEntries(input);
    }
    catch (err) {
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
    }
    catch (err) {
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
//# sourceMappingURL=payroll-journal-entry-saga.js.map