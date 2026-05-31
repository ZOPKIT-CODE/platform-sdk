"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorker = createWorker;
exports.createOrchestrationWorker = createOrchestrationWorker;
const worker_1 = require("@temporalio/worker");
const path_1 = __importDefault(require("path"));
const client_1 = require("./client");
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
async function createWorker(config) {
    const address = config.temporalAddress ?? process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
    const namespace = config.namespace ?? process.env.TEMPORAL_NAMESPACE ?? 'default';
    let connection;
    const apiKey = config.apiKey ?? process.env.TEMPORAL_API_KEY;
    if (apiKey) {
        // Temporal Cloud — API key auth (preferred for new namespaces)
        connection = await worker_1.NativeConnection.connect({
            address,
            tls: true,
            apiKey,
        });
    }
    else if (config.tlsCert && config.tlsKey) {
        // Temporal Cloud — legacy mTLS cert auth
        const cert = typeof config.tlsCert === 'string' ? Buffer.from(config.tlsCert, 'base64') : config.tlsCert;
        const key = typeof config.tlsKey === 'string' ? Buffer.from(config.tlsKey, 'base64') : config.tlsKey;
        connection = await worker_1.NativeConnection.connect({
            address,
            tls: { clientCertPair: { crt: cert, key } },
        });
    }
    else if (process.env.TEMPORAL_CLOUD === 'true' && process.env.TEMPORAL_TLS_CERT && process.env.TEMPORAL_TLS_KEY) {
        // Temporal Cloud — legacy mTLS via env vars
        const cert = Buffer.from(process.env.TEMPORAL_TLS_CERT, 'base64');
        const key = Buffer.from(process.env.TEMPORAL_TLS_KEY, 'base64');
        connection = await worker_1.NativeConnection.connect({
            address,
            tls: { clientCertPair: { crt: cert, key } },
        });
    }
    else {
        // Local Temporal server
        connection = await worker_1.NativeConnection.connect({ address });
    }
    const workerOptions = {
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
    return worker_1.Worker.create(workerOptions);
}
/**
 * Convenience factory for the Orchestration Worker.
 * Points workflowsPath at the SDK's compiled workflow bundle automatically.
 * Activities object is empty — this worker only runs workflow definitions.
 */
async function createOrchestrationWorker(opts = {}) {
    const defaultWorkflowsPath = path_1.default.resolve(__dirname, './workflows/index.js');
    return createWorker({
        ...opts,
        taskQueue: client_1.TASK_QUEUES.ORCHESTRATION,
        activities: {},
        workflowsPath: opts.workflowsPath ?? defaultWorkflowsPath,
        maxConcurrentWorkflowTaskExecutions: opts.maxConcurrentWorkflowTaskExecutions ?? 40,
        // Activities are empty — leave maxConcurrentActivityTaskExecutions at default (100).
        // Setting it to 0 is rejected by the Temporal core bridge.
    });
}
//# sourceMappingURL=worker.js.map