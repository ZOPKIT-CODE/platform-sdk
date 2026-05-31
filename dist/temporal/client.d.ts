import { Client } from '@temporalio/client';
/**
 * Temporal Cloud client factory (ADR-003, ADR-004).
 *
 * Auth priority (first match wins):
 *   1. TEMPORAL_API_KEY   — API key auth (preferred for new Cloud namespaces)
 *   2. TEMPORAL_TLS_CERT + TEMPORAL_TLS_KEY — legacy mTLS cert auth
 *   3. No credentials     — local Temporal server (dev)
 *
 * Environment variables:
 *   TEMPORAL_ADDRESS      e.g. '<namespace>.tmprl.cloud:7233' (Cloud) or 'localhost:7233' (local)
 *   TEMPORAL_NAMESPACE    e.g. 'quickstart-platforma-19ea534b.lhiuj' or 'default'
 *   TEMPORAL_API_KEY      API key from Temporal Cloud console
 *   TEMPORAL_TLS_CERT     Base64-encoded client certificate (legacy mTLS only)
 *   TEMPORAL_TLS_KEY      Base64-encoded client private key (legacy mTLS only)
 */
export declare function createTemporalClient(): Promise<Client>;
/** Task queue names — centralised so typos cause compile errors, not runtime failures. */
export declare const TASK_QUEUES: {
    /** Workflow definitions run here — no direct DB access. */
    readonly ORCHESTRATION: "orchestration";
    /** CRM-domain activities. */
    readonly CRM: "crm-activities";
    /** Financial Accounting activities. */
    readonly FA: "fa-activities";
    /** HRMS activities. */
    readonly HRMS: "hrms-activities";
    /** Project Management activities. */
    readonly PM: "pm-activities";
    /** Scheduled / background jobs. */
    readonly SCHEDULED: "scheduled-jobs";
};
export type TaskQueue = (typeof TASK_QUEUES)[keyof typeof TASK_QUEUES];
//# sourceMappingURL=client.d.ts.map