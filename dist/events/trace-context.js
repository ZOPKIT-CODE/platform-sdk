"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectTraceContext = injectTraceContext;
const api_1 = require("@opentelemetry/api");
/**
 * Inject the active trace context (sentry-trace + baggage + W3C traceparent, via
 * the host app's globally-registered propagator) into an SNS/SQS MessageAttributes
 * map so a published business event stays on the same distributed trace as the
 * code that emitted it. Mutates and returns the map.
 *
 * No-op when the host app has not registered a propagator (e.g. telemetry off):
 * the default OTel propagator injects nothing.
 */
function injectTraceContext(attrs) {
    try {
        api_1.propagation.inject(api_1.context.active(), attrs, {
            set(carrier, key, value) {
                carrier[key] = {
                    DataType: 'String',
                    StringValue: String(value),
                };
            },
        });
    }
    catch {
        // Telemetry not initialised in the host — publish without trace context.
    }
    return attrs;
}
//# sourceMappingURL=trace-context.js.map