import type { RetryPolicy } from '@temporalio/client';
/**
 * Standard Temporal retry policies for the Zopkit suite (ADR-014).
 *
 * Financial activities use conservative policies — they retry fewer times
 * and back off more aggressively to avoid double-posting journal entries
 * in edge cases where the downstream acknowledged but Temporal did not receive
 * the acknowledgment.
 */
/** For idempotent read/lookup activities — aggressive retry is safe. */
export declare const LOOKUP_RETRY: RetryPolicy;
/** For CRM mutations (invoice create/update) — moderate retry. */
export declare const CRM_MUTATION_RETRY: RetryPolicy;
/**
 * For FA journal entries and accounting mutations — conservative retry.
 * FA activities must be fully idempotent (checked by ledger entry ID).
 * Fewer retries because each retry risks a duplicate posting if idempotency
 * is not implemented correctly.
 */
export declare const FA_JOURNAL_RETRY: RetryPolicy;
/** For HRMS activities — moderate retry. */
export declare const HRMS_RETRY: RetryPolicy;
/** For PM activities — moderate retry. */
export declare const PM_RETRY: RetryPolicy;
/** For external API calls (Wrapper bootstrap, credit checks) — quick initial retry. */
export declare const EXTERNAL_API_RETRY: RetryPolicy;
/** For email/notification activities — fire-and-forget with limited retries. */
export declare const NOTIFICATION_RETRY: RetryPolicy;
/** Standard activity options by type — use with proxyActivities. */
export declare const ACTIVITY_OPTIONS: {
    readonly lookup: {
        readonly startToCloseTimeout: "30s";
        readonly retry: RetryPolicy;
    };
    readonly crmMutation: {
        readonly startToCloseTimeout: "30s";
        readonly retry: RetryPolicy;
    };
    readonly faJournal: {
        readonly startToCloseTimeout: "60s";
        readonly retry: RetryPolicy;
    };
    readonly hrms: {
        readonly startToCloseTimeout: "30s";
        readonly retry: RetryPolicy;
    };
    readonly pm: {
        readonly startToCloseTimeout: "30s";
        readonly retry: RetryPolicy;
    };
    readonly externalApi: {
        readonly startToCloseTimeout: "30s";
        readonly retry: RetryPolicy;
    };
    readonly notification: {
        readonly startToCloseTimeout: "15s";
        readonly retry: RetryPolicy;
    };
};
//# sourceMappingURL=retry-policies.d.ts.map