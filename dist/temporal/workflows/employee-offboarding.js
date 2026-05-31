"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeOffboardingWorkflow = employeeOffboardingWorkflow;
const workflow_1 = require("@temporalio/workflow");
const retry_policies_1 = require("../retry-policies");
const pm = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.pm);
const crm = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.crmMutation);
const hrms = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.hrms);
const fa = (0, workflow_1.proxyActivities)(retry_policies_1.ACTIVITY_OPTIONS.faJournal);
async function employeeOffboardingWorkflow(input) {
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
//# sourceMappingURL=employee-offboarding.js.map