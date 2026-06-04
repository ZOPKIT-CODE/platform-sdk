/**
 * Inject the active trace context (sentry-trace + baggage + W3C traceparent, via
 * the host app's globally-registered propagator) into an SNS/SQS MessageAttributes
 * map so a published business event stays on the same distributed trace as the
 * code that emitted it. Mutates and returns the map.
 *
 * No-op when the host app has not registered a propagator (e.g. telemetry off):
 * the default OTel propagator injects nothing.
 */
export declare function injectTraceContext<T extends Record<string, {
    DataType: string;
    StringValue: string;
}>>(attrs: T): T;
//# sourceMappingURL=trace-context.d.ts.map