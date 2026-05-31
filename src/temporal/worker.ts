import { Worker, NativeConnection, Runtime } from '@temporalio/worker';
import path from 'path';
import { TASK_QUEUES } from './client';

export interface WorkerConfig {
  /** Which task queue this worker will poll. Use TASK_QUEUES constants. */
  taskQueue: string;
  /**
   * Activities to register. Pass an object whose keys are activity names
   * and values are the implementation functions.
   */
  activities: Record<string, (...args: any[]) => any>;
  /**
   * Absolute path to the compiled workflow bundle OR to a TS source file
   * when using ts-node/tsx in dev. Only needed for the Orchestration worker.
   * Activity-only workers (crm, fa, hrms, pm) do NOT pass this.
   */
  workflowsPath?: string;
  /** Temporal Cloud address, e.g. "my-namespace.tmprl.cloud:7233". Defaults to localhost:7233. */
  temporalAddress?: string;
  /** Temporal namespace. Defaults to "default". */
  namespace?: string;
  /** API key for Temporal Cloud (preferred over mTLS for new namespaces). */
  apiKey?: string;
  /** PEM-encoded TLS cert (legacy mTLS — use apiKey for new Cloud namespaces). */
  tlsCert?: string | Buffer;
  /** PEM-encoded TLS key (legacy mTLS — use apiKey for new Cloud namespaces). */
  tlsKey?: string | Buffer;
  /** Max concurrent activity task executions. Defaults to 100. */
  maxConcurrentActivityTaskExecutions?: number;
  /** Max concurrent workflow task executions. Defaults to 40. */
  maxConcurrentWorkflowTaskExecutions?: number;
}

/**
 * Creates and returns a Temporal Worker.
 *
 * Usage — Orchestration worker (has workflows + no activities of its own):
 *   const worker = await createWorker({
 *     taskQueue: TASK_QUEUES.ORCHESTRATION,
 *     workflowsPath: require.resolve('./workflows'),   // compiled bundle
 *     activities: {},
 *   });
 *   await worker.run();
 *
 * Usage — Domain activity worker (no workflow definitions):
 *   const worker = await createWorker({
 *     taskQueue: TASK_QUEUES.CRM,
 *     activities: { createInvoice, voidInvoice, ... },
 *   });
 *   await worker.run();
 */
export async function createWorker(config: WorkerConfig): Promise<Worker> {
  const address = config.temporalAddress ?? process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
  const namespace = config.namespace ?? process.env.TEMPORAL_NAMESPACE ?? 'default';

  let connection: NativeConnection;

  const apiKey = config.apiKey ?? process.env.TEMPORAL_API_KEY;

  if (apiKey) {
    // Temporal Cloud — API key auth (preferred for new namespaces)
    connection = await NativeConnection.connect({
      address,
      tls: true,
      apiKey,
    });
  } else if (config.tlsCert && config.tlsKey) {
    // Temporal Cloud — legacy mTLS cert auth
    const cert = typeof config.tlsCert === 'string' ? Buffer.from(config.tlsCert, 'base64') : config.tlsCert;
    const key = typeof config.tlsKey === 'string' ? Buffer.from(config.tlsKey, 'base64') : config.tlsKey;
    connection = await NativeConnection.connect({
      address,
      tls: { clientCertPair: { crt: cert, key } },
    });
  } else if (process.env.TEMPORAL_CLOUD === 'true' && process.env.TEMPORAL_TLS_CERT && process.env.TEMPORAL_TLS_KEY) {
    // Temporal Cloud — legacy mTLS via env vars
    const cert = Buffer.from(process.env.TEMPORAL_TLS_CERT, 'base64');
    const key = Buffer.from(process.env.TEMPORAL_TLS_KEY, 'base64');
    connection = await NativeConnection.connect({
      address,
      tls: { clientCertPair: { crt: cert, key } },
    });
  } else {
    // Local Temporal server
    connection = await NativeConnection.connect({ address });
  }

  const workerOptions: Parameters<typeof Worker.create>[0] = {
    connection,
    namespace,
    taskQueue: config.taskQueue,
    activities: config.activities,
    maxConcurrentActivityTaskExecutions: config.maxConcurrentActivityTaskExecutions ?? 100,
    maxConcurrentWorkflowTaskExecutions: config.maxConcurrentWorkflowTaskExecutions ?? 40,
  };

  if (config.workflowsPath) {
    workerOptions.workflowsPath = config.workflowsPath;
  }

  return Worker.create(workerOptions);
}

/**
 * Convenience factory for the Orchestration Worker.
 * Points workflowsPath at the SDK's compiled workflow bundle automatically.
 * Activities object is empty — this worker only runs workflow definitions.
 */
export async function createOrchestrationWorker(
  opts: Omit<WorkerConfig, 'taskQueue' | 'workflowsPath' | 'activities'> & {
    /** Override the workflow bundle path. Defaults to the SDK's own dist/temporal/workflows/index.js */
    workflowsPath?: string;
  } = {},
): Promise<Worker> {
  const defaultWorkflowsPath = path.resolve(__dirname, './workflows/index.js');

  return createWorker({
    ...opts,
    taskQueue: TASK_QUEUES.ORCHESTRATION,
    activities: {},
    workflowsPath: opts.workflowsPath ?? defaultWorkflowsPath,
    maxConcurrentWorkflowTaskExecutions: opts.maxConcurrentWorkflowTaskExecutions ?? 40,
    // Activities are empty — leave maxConcurrentActivityTaskExecutions at default (100).
    // Setting it to 0 is rejected by the Temporal core bridge.
  });
}
