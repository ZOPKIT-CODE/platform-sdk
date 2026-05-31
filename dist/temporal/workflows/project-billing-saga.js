"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectBillingSaga = projectBillingSaga;
const workflow_1 = require("@temporalio/workflow");
const retry_policies_1 = require("../retry-policies");
const crm = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.crmMutation);
const fa = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.faJournal);
const pm = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.pm);
async function projectBillingSaga(input) {
    // Step 1: Credit limit check (synchronous gate — ADR-017)
    const creditOk = await fa.checkCreditLimit({
        tenantId: input.tenantId,
        customerId: input.customerId,
        amount: input.billingAmount,
        currency: input.currency,
    });
    if (!creditOk) {
        throw workflow_1.ApplicationFailure.create({
            message: `Credit limit exceeded for customer ${input.customerId}`,
            nonRetryable: true,
            type: 'CreditLimitExceededError',
        });
    }
    // Step 2: Create invoice in CRM
    let invoiceId;
    try {
        invoiceId = await crm.createInvoice(input);
    }
    catch (err) {
        // Nothing was created — rethrow with no compensation needed
        throw workflow_1.ApplicationFailure.fromError(err);
    }
    // Step 3: Recognize revenue in FA — compensate by voiding invoice on failure
    try {
        await fa.recognizeRevenue({
            tenantId: input.tenantId,
            invoiceId,
            correlationId: input.correlationId,
            method: input.revenueRecognitionMethod,
            amount: input.billingAmount,
            currency: input.currency,
        });
    }
    catch (err) {
        await crm.voidInvoice({
            tenantId: input.tenantId,
            invoiceId,
            reason: 'Revenue recognition failed — saga compensation',
        });
        throw workflow_1.ApplicationFailure.fromError(err);
    }
    // Step 4: Close billing cycle in PM
    await pm.closeBillingCycle({
        tenantId: input.tenantId,
        projectId: input.projectId,
        invoiceId,
        milestoneId: input.milestoneId,
    });
}
//# sourceMappingURL=project-billing-saga.js.map