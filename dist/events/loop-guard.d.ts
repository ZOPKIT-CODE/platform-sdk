import type { AppCode, BusinessEvent } from './envelope';
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
export declare function wouldCreateLoop(incomingEvent: Pick<BusinessEvent, 'sourceSystem' | 'causationId'>, mySystem: AppCode): boolean;
/**
 * Build the causationId for a new event that is being published in reaction
 * to an incoming event. Always propagate correlationId unchanged.
 */
export declare function buildCausation(parentEvent: Pick<BusinessEvent, 'messageId' | 'correlationId'>): {
    causationId: string;
    correlationId: string;
};
//# sourceMappingURL=loop-guard.d.ts.map