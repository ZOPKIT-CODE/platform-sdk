"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceCollectionWorkflow = invoiceCollectionWorkflow;
const workflow_1 = require("@temporalio/workflow");
const retry_policies_1 = require("../retry-policies");
const acts = (0, workflow_1.proxyActivities)({
    ...retry_policies_1.ACTIVITY_OPTIONS.lookup,
    startToCloseTimeout: '30s',
});
const notify = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.notification);
const fa = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.faJournal);
async function invoiceCollectionWorkflow(input) {
    // Day 15: first reminder
    await (0, workflow_1.sleep)('15 days');
    const statusAt15 = await acts.getInvoicePaymentStatus({
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
    });
    if (statusAt15 === 'paid' || statusAt15 === 'voided') {
        return; // Done — invoice settled or cancelled
    }
    await notify.sendPaymentReminder({
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        invoiceNumber: input.invoiceNumber,
        customerId: input.customerId,
        attempt: 1,
        amount: input.amount,
        currency: input.currency,
    });
    // Day 30: second check — escalate if still unpaid
    await (0, workflow_1.sleep)('15 days');
    const statusAt30 = await acts.getInvoicePaymentStatus({
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
    });
    if (statusAt30 === 'paid' || statusAt30 === 'voided') {
        return;
    }
    // Overdue — escalate in CRM and mark in FA
    await Promise.all([
        notify.escalateOverdueInvoice({
            tenantId: input.tenantId,
            invoiceId: input.invoiceId,
            invoiceNumber: input.invoiceNumber,
            customerId: input.customerId,
            amount: input.amount,
            currency: input.currency,
        }),
        fa.markInvoiceOverdue({
            tenantId: input.tenantId,
            invoiceId: input.invoiceId,
        }),
    ]);
}
//# sourceMappingURL=invoice-collection.js.map