"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantProvisioningWorkflow = tenantProvisioningWorkflow;
const workflow_1 = require("@temporalio/workflow");
const retry_policies_1 = require("../retry-policies");
// ── Per-app activity proxies — each routes to its own task queue ──────────────
const crm = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '30s',
    retry: retry_policies_1.CRM_MUTATION_RETRY,
    taskQueue: 'crm-activities',
});
const fa = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '60s',
    retry: retry_policies_1.FA_JOURNAL_RETRY,
    taskQueue: 'fa-activities',
});
const hrms = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '30s',
    retry: retry_policies_1.HRMS_RETRY,
    taskQueue: 'hrms-activities',
});
const pm = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '30s',
    retry: retry_policies_1.PM_RETRY,
    taskQueue: 'pm-activities',
});
// ── Workflow ──────────────────────────────────────────────────────────────────
async function tenantProvisioningWorkflow(snapshot) {
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
//# sourceMappingURL=tenant-provisioning.js.map