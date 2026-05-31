import { Worker } from '@temporalio/worker';
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
export declare function createWorker(config: WorkerConfig): Promise<Worker>;
/**
 * Convenience factory for the Orchestration Worker.
 * Points workflowsPath at the SDK's compiled workflow bundle automatically.
 * Activities object is empty — this worker only runs workflow definitions.
 */
export declare function createOrchestrationWorker(opts?: Omit<WorkerConfig, 'taskQueue' | 'workflowsPath' | 'activities'> & {
    /** Override the workflow bundle path. Defaults to the SDK's own dist/temporal/workflows/index.js */
    workflowsPath?: string;
}): Promise<Worker>;
//# sourceMappingURL=worker.d.ts.map