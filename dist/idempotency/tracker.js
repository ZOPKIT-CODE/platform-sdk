"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryIdempotencyStore = void 0;
/**
 * In-memory idempotency store for testing only.
 * DO NOT use in production — state is lost on restart.
 */
class InMemoryIdempotencyStore {
    constructor() {
        this.seen = new Set();
    }
    key(messageId, tenantId, eventType) {
        return `${messageId}::${tenantId}::${eventType}`;
    }
    async markProcessed(messageId, tenantId, eventType) {
        const k = this.key(messageId, tenantId, eventType);
        if (this.seen.has(k))
            return false;
        this.seen.add(k);
        return true;
    }
    async isProcessed(messageId, tenantId, eventType) {
        return this.seen.has(this.key(messageId, tenantId, eventType));
    }
    async purgeOlderThan(_date) {
        return 0;
    }
}
exports.InMemoryIdempotencyStore = InMemoryIdempotencyStore;
//# sourceMappingURL=tracker.js.map