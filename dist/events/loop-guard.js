"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wouldCreateLoop = wouldCreateLoop;
exports.buildCausation = buildCausation;
/**
 * Three-layer loop prevention (ADR-012).
 *
 * Layer 1 (this function) — application-level causation check.
 * Layer 2 — EventBridge rule filters (sourceSystem != mySystem) on the queue subscription.
 * Layer 3 — FA as a pure sink by design (most loops impossible structurally).
 *
 * Returns true if publishing a new event in response to `incomingEvent` would
 * create an event loop. Call this before publishing any reactive event.
 */
function wouldCreateLoop(incomingEvent, mySystem) {
    return incomingEvent.sourceSystem === mySystem;
}
/**
 * Build the causationId for a new event that is being published in reaction
 * to an incoming event. Always propagate correlationId unchanged.
 */
function buildCausation(parentEvent) {
    return {
        causationId: parentEvent.messageId,
        correlationId: parentEvent.correlationId,
    };
}
//# sourceMappingURL=loop-guard.js.map