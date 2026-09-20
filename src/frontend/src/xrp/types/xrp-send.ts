import type { XrpPendingTransaction } from '$xrp/types/xrp-transaction';

export class XrpAmountAssertionError extends Error {}

/**
 * A pre-sign refusal the caller can present as a correction rather than a fault. All three fire
 * before anything is signed or submitted, so nothing left the wallet and the user can fix the
 * input and send again.
 *
 * Separate types rather than one with a code, because the corrections have nothing in common —
 * lower the amount, raise it, or supply a tag — and a caller that handles only some of them
 * should fail to compile against the rest rather than share a branch that fits none of them.
 */
export class XrpAmountExceedsSendableError extends Error {}

/**
 * The destination holds no settled account, so the payment must itself fund one: below the account
 * reserve XRPL answers `tecNO_DST_INSUF_XRP`, which is applied and claims the fee.
 */
export class XrpDestinationUnfundedError extends Error {}

/**
 * The destination sets `RequireDest`, so a payment without a tag cannot be credited. Exchanges and
 * custodians set it precisely because an untagged deposit cannot be attributed to a customer.
 */
export class XrpDestinationTagRequiredError extends Error {}

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
