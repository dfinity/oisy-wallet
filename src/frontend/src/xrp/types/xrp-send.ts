export class XrpAmountAssertionError extends Error {}

/**
 * The transaction reached a validated ledger and failed there — a `tec*` result, which claims the
 * fee. Distinct from an indeterminate confirmation: the outcome is known and final.
 */
export class XrpTransactionFailedError extends Error {}
