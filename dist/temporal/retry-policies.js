"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVITY_OPTIONS = exports.NOTIFICATION_RETRY = exports.EXTERNAL_API_RETRY = exports.PM_RETRY = exports.HRMS_RETRY = exports.FA_JOURNAL_RETRY = exports.CRM_MUTATION_RETRY = exports.LOOKUP_RETRY = void 0;
/**
 * Standard Temporal retry policies for the Zopkit suite (ADR-014).
 *
 * Financial activities use conservative policies — they retry fewer times
 * and back off more aggressively to avoid double-posting journal entries
 * in edge cases where the downstream acknowledged but Temporal did not receive
 * the acknowledgment.
 */
/** For idempotent read/lookup activities — aggressive retry is safe. */
exports.LOOKUP_RETRY = {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 10,
    nonRetryableErrorTypes: ['NotFoundError', 'ValidationError'],
};
/** For CRM mutations (invoice create/update) — moderate retry. */
exports.CRM_MUTATION_RETRY = {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['DuplicateError', 'ValidationError'],
};
/**
 * For FA journal entries and accounting mutations — conservative retry.
 * FA activities must be fully idempotent (checked by ledger entry ID).
 * Fewer retries because each retry risks a duplicate posting if idempotency
 * is not implemented correctly.
 */
exports.FA_JOURNAL_RETRY = {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumInterval: '120s',
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['DuplicateEntryError', 'ValidationError', 'AccountNotFoundError'],
};
/** For HRMS activities — moderate retry. */
exports.HRMS_RETRY = {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['EmployeeNotFoundError', 'ValidationError'],
};
/** For PM activities — moderate retry. */
exports.PM_RETRY = {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['ProjectNotFoundError', 'ValidationError'],
};
/** For external API calls (Wrapper bootstrap, credit checks) — quick initial retry. */
exports.EXTERNAL_API_RETRY = {
    initialInterval: '1s',
    backoffCoefficient: 1.5,
    maximumInterval: '30s',
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['AuthError', 'NotFoundError'],
};
/** For email/notification activities — fire-and-forget with limited retries. */
exports.NOTIFICATION_RETRY = {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 3,
};
/** Standard activity options by type — use with proxyActivities. */
exports.ACTIVITY_OPTIONS = {
    lookup: { startToCloseTimeout: '30s', retry: exports.LOOKUP_RETRY },
    crmMutation: { startToCloseTimeout: '30s', retry: exports.CRM_MUTATION_RETRY },
    faJournal: { startToCloseTimeout: '60s', retry: exports.FA_JOURNAL_RETRY },
    hrms: { startToCloseTimeout: '30s', retry: exports.HRMS_RETRY },
    pm: { startToCloseTimeout: '30s', retry: exports.PM_RETRY },
    externalApi: { startToCloseTimeout: '30s', retry: exports.EXTERNAL_API_RETRY },
    notification: { startToCloseTimeout: '15s', retry: exports.NOTIFICATION_RETRY },
};
//# sourceMappingURL=retry-policies.js.map