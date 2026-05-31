"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantBootstrapWorkflow = tenantBootstrapWorkflow;
const workflow_1 = require("@temporalio/workflow");
const retry_policies_1 = require("../retry-policies");
const fa = (0, workflow_1.proxyActivities)({
    // Bootstrap can run 30-60s for large snapshots. Give generous headroom.
    startToCloseTimeout: '10m',
    retry: {
        ...retry_policies_1.FA_JOURNAL_RETRY,
        maximumAttempts: 5,
        nonRetryableErrorTypes: ['ValidationError'],
    },
    taskQueue: 'fa-activities',
});
async function tenantBootstrapWorkflow(input) {
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
//# sourceMappingURL=tenant-bootstrap.js.map