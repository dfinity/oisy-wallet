/**
 * Limits the backend enforces on the stored transaction cache.
 *
 * These mirror `src/shared/src/types/user_transaction.rs`. The canister rejects an over-sized save
 * outright rather than truncating it, and trims the oldest entries once a token is over its cap, so
 * the frontend has to respect both numbers to persist anything usefully.
 */

/** Maximum transactions the canister accepts in a single `save_user_transactions` call. */
export const MAX_SAVE_USER_TRANSACTIONS_BATCH = 500;

/** Maximum transactions the canister stores per (user, token) pair before trimming the oldest. */
export const MAX_USER_TRANSACTIONS_PER_TOKEN = 10_000;
