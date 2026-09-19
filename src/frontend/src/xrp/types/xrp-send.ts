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
 * The signed transaction travels with the error so a retry CAN resubmit THIS transaction instead
 * of building a new one — the difference between a retry the ledger refuses on its already-consumed
 * sequence and a second payment.
 *
 * Nothing consumes it yet, so the hazard is NOT closed. `pending` only survives as a field on the
 * rejected promise: nothing in the XRP folder persists it, and the send wizard reports the error
 * and closes, after which it is unreachable. A user who dismisses that and sends again still
 * builds a fresh transaction, which is the second payment this is meant to prevent. Consuming it
 * needs a surface that resolves an unconfirmed send, which belongs with transaction history; the
 * in-repo precedent is BTC, which persists pending send state server-side via
 * `addPendingBtcTransaction` so it survives a reload and reaches other devices.
 */
export class XrpSendIndeterminateError extends Error {
	readonly pending: XrpPendingTransaction;

	constructor({ message, pending }: { message: string; pending: XrpPendingTransaction }) {
		super(message);
		this.pending = pending;
	}
}
