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
 * A payment from this address has not resolved yet, so this one is refused.
 *
 * An XRPL `Sequence` is a nonce, and while the first payment is open there is no safe sequence for
 * a second: reusing it answers `tefPAST_SEQ` or replaces a queued transaction, and taking the next
 * one signs into a gap that expires — which reports "nothing was sent" for a payment that can
 * still apply. There is deliberately no override; the only correct action is to wait, and the wait
 * is bounded by the signed `LastLedgerSequence`.
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
 * moment a user is most likely to retry, and would leave the payment with no record to resolve it.
 */
export class XrpSendNotGuardedError extends Error {}
