"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_QUEUES = void 0;
exports.createTemporalClient = createTemporalClient;
const client_1 = require("@temporalio/client");
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
async function createTemporalClient() {
    const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
    const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';
    const apiKey = process.env.TEMPORAL_API_KEY;
    let connection;
    if (apiKey) {
        // Temporal Cloud — API key auth
        connection = await client_1.Connection.connect({ address, tls: true, apiKey });
    }
    else if (process.env.TEMPORAL_TLS_CERT && process.env.TEMPORAL_TLS_KEY) {
        // Temporal Cloud — legacy mTLS
        connection = await client_1.Connection.connect({
            address,
            tls: {
                clientCertPair: {
                    crt: Buffer.from(process.env.TEMPORAL_TLS_CERT, 'base64'),
                    key: Buffer.from(process.env.TEMPORAL_TLS_KEY, 'base64'),
                },
            },
        });
    }
    else {
        // Local dev
        connection = await client_1.Connection.connect({ address });
    }
    return new client_1.Client({ connection, namespace });
}
/** Task queue names — centralised so typos cause compile errors, not runtime failures. */
exports.TASK_QUEUES = {
    /** Workflow definitions run here — no direct DB access. */
    ORCHESTRATION: 'orchestration',
    /** CRM-domain activities. */
    CRM: 'crm-activities',
    /** Financial Accounting activities. */
    FA: 'fa-activities',
    /** HRMS activities. */
    HRMS: 'hrms-activities',
    /** Project Management activities. */
    PM: 'pm-activities',
    /** Scheduled / background jobs. */
    SCHEDULED: 'scheduled-jobs',
};
//# sourceMappingURL=client.js.map