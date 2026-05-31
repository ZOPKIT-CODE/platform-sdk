import { Client, Connection } from '@temporalio/client';

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
export async function createTemporalClient(): Promise<Client> {
  const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';
  const apiKey = process.env.TEMPORAL_API_KEY;

  let connection: Connection;

  if (apiKey) {
    // Temporal Cloud — API key auth
    connection = await Connection.connect({ address, tls: true, apiKey });
  } else if (process.env.TEMPORAL_TLS_CERT && process.env.TEMPORAL_TLS_KEY) {
    // Temporal Cloud — legacy mTLS
    connection = await Connection.connect({
      address,
      tls: {
        clientCertPair: {
          crt: Buffer.from(process.env.TEMPORAL_TLS_CERT, 'base64'),
          key: Buffer.from(process.env.TEMPORAL_TLS_KEY, 'base64'),
        },
      },
    });
  } else {
    // Local dev
    connection = await Connection.connect({ address });
  }

  return new Client({ connection, namespace });
}

/** Task queue names — centralised so typos cause compile errors, not runtime failures. */
export const TASK_QUEUES = {
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
} as const;

export type TaskQueue = (typeof TASK_QUEUES)[keyof typeof TASK_QUEUES];
