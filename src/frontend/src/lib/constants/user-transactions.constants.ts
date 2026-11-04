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

/**
 * Length the canister cuts the hex-encoded EVM input data to when it stores a transaction: `0x`, the
 * function selector and the first two arguments, which is all the wallet reads from it. Cutting it
 * before the save keeps the rest from being sent at all.
 */
export const MAX_STORED_USER_TRANSACTION_DATA_LEN = 138;
