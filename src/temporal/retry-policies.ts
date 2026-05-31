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
export const LOOKUP_RETRY: RetryPolicy = {
  initialInterval: '1s',
  backoffCoefficient: 2,
  maximumInterval: '30s',
  maximumAttempts: 10,
  nonRetryableErrorTypes: ['NotFoundError', 'ValidationError'],
};

/** For CRM mutations (invoice create/update) — moderate retry. */
export const CRM_MUTATION_RETRY: RetryPolicy = {
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
export const FA_JOURNAL_RETRY: RetryPolicy = {
  initialInterval: '5s',
  backoffCoefficient: 2,
  maximumInterval: '120s',
  maximumAttempts: 3,
  nonRetryableErrorTypes: ['DuplicateEntryError', 'ValidationError', 'AccountNotFoundError'],
};

/** For HRMS activities — moderate retry. */
export const HRMS_RETRY: RetryPolicy = {
  initialInterval: '2s',
  backoffCoefficient: 2,
  maximumInterval: '60s',
  maximumAttempts: 5,
  nonRetryableErrorTypes: ['EmployeeNotFoundError', 'ValidationError'],
};

/** For PM activities — moderate retry. */
export const PM_RETRY: RetryPolicy = {
  initialInterval: '2s',
  backoffCoefficient: 2,
  maximumInterval: '60s',
  maximumAttempts: 5,
  nonRetryableErrorTypes: ['ProjectNotFoundError', 'ValidationError'],
};

/** For external API calls (Wrapper bootstrap, credit checks) — quick initial retry. */
export const EXTERNAL_API_RETRY: RetryPolicy = {
  initialInterval: '1s',
  backoffCoefficient: 1.5,
  maximumInterval: '30s',
  maximumAttempts: 5,
  nonRetryableErrorTypes: ['AuthError', 'NotFoundError'],
};

/** For email/notification activities — fire-and-forget with limited retries. */
export const NOTIFICATION_RETRY: RetryPolicy = {
  initialInterval: '5s',
  backoffCoefficient: 2,
  maximumInterval: '60s',
  maximumAttempts: 3,
};

/** Standard activity options by type — use with proxyActivities. */
export const ACTIVITY_OPTIONS = {
  lookup: { startToCloseTimeout: '30s', retry: LOOKUP_RETRY },
  crmMutation: { startToCloseTimeout: '30s', retry: CRM_MUTATION_RETRY },
  faJournal: { startToCloseTimeout: '60s', retry: FA_JOURNAL_RETRY },
  hrms: { startToCloseTimeout: '30s', retry: HRMS_RETRY },
  pm: { startToCloseTimeout: '30s', retry: PM_RETRY },
  externalApi: { startToCloseTimeout: '30s', retry: EXTERNAL_API_RETRY },
  notification: { startToCloseTimeout: '15s', retry: NOTIFICATION_RETRY },
} as const;
