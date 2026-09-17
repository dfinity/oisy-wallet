import type { XrpPendingTransaction } from '$xrp/types/xrp-transaction';

export class XrpAmountAssertionError extends Error {}

/**
 * The transaction reached a validated ledger and failed there — a `tec*` result, which claims the
 * fee. Distinct from an indeterminate confirmation: the outcome is known and final.
 */
export class XrpTransactionFailedError extends Error {}

/**
 * The ledger advanced past the transaction's `LastLedgerSequence` without including it, so it can
 * never be applied. Definitive: sending again is safe, and must build a new transaction because
 * this one is now unusable.
 */
export class XrpSendExpiredError extends Error {}

/**
 * The send's outcome could not be established — the node stopped answering, or confirmation ran
 * out of attempts before the ledger reached expiry. The payment may or may not have happened.
 *
 * The signed transaction travels with the error so a retry can resubmit THIS transaction instead
 * of building a new one. That is the difference between a retry the ledger deduplicates and a
 * second payment.
 */
export class XrpSendIndeterminateError extends Error {
	readonly pending: XrpPendingTransaction;

	constructor({ message, pending }: { message: string; pending: XrpPendingTransaction }) {
		super(message);
		this.pending = pending;
	}
}
