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
 * The destination is the sending account. XRPL applies such a payment as `temREDUNDANT`, and there
 * is nothing to deliver in any case — the correction is a different recipient, not a different
 * amount, so it routes to the destination step rather than the form.
 */
export class XrpSelfDestinationError extends Error {}

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
 * The second payment is now prevented from the other side: `sendXrp` opens an Active User
 * Transaction record before submitting and leaves it open on this error, and the record refuses
 * the next send from the same address until the ledger resolves it. So a user who dismisses this
 * and sends again is declined rather than building a fresh transaction on a new sequence.
 *
 * `pending` itself still only survives as a field on the rejected promise — nothing persists the
 * blob, because it does not fit an `external_refs` value (256 characters against a signed
 * Payment's 378) and storing it buys no safety the record does not already provide. It remains
 * available to an in-session retry through {@link retryXrpSend}, which resubmits these exact bytes
 * on their already-consumed sequence rather than paying twice.
 */
export class XrpSendIndeterminateError extends Error {
	readonly pending: XrpPendingTransaction;

	constructor({ message, pending }: { message: string; pending: XrpPendingTransaction }) {
		super(message);
		this.pending = pending;
	}
}

/**
 * A payment from this address has not resolved yet, so this one is refused.
 *
 * An XRPL `Sequence` is a nonce, and while the first payment is open there is no safe sequence for
 * a second: reusing it answers `tefPAST_SEQ` or replaces a queued transaction, and taking the next
 * one signs into a gap that expires — which reports "nothing was sent" for a payment that can
 * still apply. There is deliberately no override; the only correct action is to wait.
 *
 * Fires before any node read and before anything is signed, so nothing left the wallet.
 */
export class XrpSendAlreadyInFlightError extends Error {}

/**
 * The send was refused because the invariant could not be held at all — the record could not be
 * read or written.
 *
 * Distinct from {@link XrpSendAlreadyInFlightError}: there is no known open payment, and the
 * correction is to try again rather than to wait for something to settle. It fails closed on
 * purpose. Proceeding would drop the one-unresolved-payment-per-address guarantee at exactly the
 * moment a user is most likely to retry, and the cost of that is a duplicate payment rather than a
 * refused one.
 */
export class XrpSendNotGuardedError extends Error {}
