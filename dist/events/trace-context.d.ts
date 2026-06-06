/**
 * Run `fn` inside a PRODUCER span made the ACTIVE context for its duration.
 *
 * This exists so injectTraceContext (which reads context.active()) always has a
 * valid recording span to propagate — even when the publish originates from a
 * background job / scheduler / outbox poller with no ambient request span. Without
 * it, such publishes inject an empty context and the downstream SQS consumer
 * starts a fresh root trace, severing the cross-service link.
 *
 * Vendor-neutral: uses only @opentelemetry/api, so it stays framework-agnostic.
 * The host app's registered span processor (e.g. Sentry Mode A) exports the span.
 * When telemetry is off, getTracer returns a no-op tracer and this is a
 * transparent pass-through (the span is non-recording, injection stays a no-op).
 */
export declare function withProducerSpan<T>(name: string, attributes: Record<string, string | number | boolean>, fn: () => Promise<T>): Promise<T>;
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