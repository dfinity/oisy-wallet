export const XRP_DERIVATION_PATH_PREFIX = 'XRP';

// XRPL account base reserve in drops (1 XRP = 1,000,000 drops). An account must retain
// at least this amount to remain on-ledger, so it is subtracted from the max sendable.
// This is the current network value; it is a validator-configurable amount.
export const XRP_BASE_RESERVE_DROPS = 1_000_000n;

// XRPL owner reserve in drops, required *per ledger object* the account owns (trust lines,
// offers, escrows, …) on top of the base reserve. Also the current, validator-configurable
// network value.
//
// TODO: both reserves are authoritatively reported by the node (`server_state` returns them
// in drops); reading them would survive a network change. Left hardcoded for now because the
// call has not been verified against a live XRPL node.
export const XRP_OWNER_RESERVE_DROPS = 200_000n;

// Fallback per-transaction fee in drops, used when the node's fee estimate is unavailable.
export const XRP_DEFAULT_FEE_DROPS = 10n;

// Ceiling for the fee taken from the node's estimate. The estimate is untrusted input and
// escalates with load, so it is bounded rather than signed as-is: 1000x the base fee leaves
// room for real congestion while keeping a hostile value from being signed. For reference,
// xrpl.js caps at 2 XRP (2_000_000 drops), which is far more than a wallet payment needs.
export const XRP_MAX_FEE_DROPS = 10_000n;

// Ledgers added to the current index for a transaction's LastLedgerSequence, bounding how
// long it can be included before it definitively fails rather than lingering.
// `lsfRequireDestTag` in the AccountRoot flags: payments to this account must carry a
// `DestinationTag`. Set by exchanges and other shared accounts, where the tag is what credits the
// payment to a customer. A payment without one is applied as `tecDST_TAG_NEEDED` — the fee is
// destroyed and the sequence consumed — so it is refused before signing instead.
// A `DestinationTag` is a protocol `UInt32`, and both ends are real tags: `0` is a tag rather than
// an absent one, and so is `0xFFFFFFFF`. Anything outside dies inside `ripple-binary-codec`, well
// past the point where the arguments could have said so.
export const XRP_MAX_DESTINATION_TAG = 0xffff_ffff;

export const XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG = 0x00020000;

export const XRP_LAST_LEDGER_SEQUENCE_OFFSET = 20;

// Mainnet ledgers close on a ~4s cadence, so the offset above is a validity window of ~80s.
const XRP_LEDGER_CLOSE_SECONDS = 4;

// Deadline on every XRPL request, because `fetch` has none of its own: a connection that stalls
// instead of rejecting never settles, and the confirmation loop bounds ATTEMPTS rather than time —
// so one hung request suspends the whole send indefinitely, and `sendXrp` never rejects with the
// signed blob a retry needs.
//
// Two ledger closes rather than a figure picked for feel: a request that outlives that cannot tell
// the poll anything the next one will not, since the ledger itself has moved on. Aborting makes a
// stall a rejected fetch, which the loop already treats as one consumed attempt.
export const XRP_RPC_TIMEOUT_MS = XRP_LEDGER_CLOSE_SECONDS * 2 * 1000;

// The confirmation poll's interval, passed to `randomWait` rather than left to its defaults: the
// two derivations below are only correct if this is what the loop actually waits, and mirroring
// another module's defaults would let a change there make them silently wrong.
export const XRP_CONFIRM_MIN_POLL_MS = 1000;
export const XRP_CONFIRM_MAX_POLL_MS = 2000;

// Longest interval the poll can wait. Used to convert "ledger closes remaining" into "polls to
// wait": the LONGEST wait gives the FEWEST polls per close, so the conversion under-counts and the
// confirmation loop asks again slightly early rather than slightly late — a wasted call costs one
// request, asking late costs the definitive expiry answer.
const XRP_CONFIRM_MAX_POLL_SECONDS = XRP_CONFIRM_MAX_POLL_MS / 1000;

// Polls to skip per ledger close still needed before expiry is even possible. Asking on every poll
// made almost every one of those calls incapable of changing the outcome: expiry needs the
// validated index to pass `LastLedgerSequence`, which is `XRP_LAST_LEDGER_SEQUENCE_OFFSET` closes
// away, while the poll runs three times as often as the ledger advances.
export const XRP_CONFIRM_POLLS_PER_LEDGER_CLOSE = Math.floor(
	XRP_LEDGER_CLOSE_SECONDS / XRP_CONFIRM_MAX_POLL_SECONDS
);

// Shortest interval the poll can wait, and so the conservative denominator below: the fastest
// polling needs the most attempts to span the window.
const XRP_CONFIRM_MIN_POLL_SECONDS = XRP_CONFIRM_MIN_POLL_MS / 1000;

// Twice the window rather than exactly it, so a slower-than-usual ledger pace cannot end the poll
// before the ledger has decided.
const XRP_CONFIRM_WINDOW_MARGIN = 2;

// Derived from the validity window, not chosen. Reaching this cap is the one exit that ends a send
// with its outcome unknown — the ledger may still have applied it, and a rebuilt retry would then
// pay twice — so it must outlast the window in every case. Expiry, which IS definitive, is what
// normally ends the loop.
export const XRP_CONFIRM_MAX_ATTEMPTS =
	(XRP_LAST_LEDGER_SEQUENCE_OFFSET * XRP_LEDGER_CLOSE_SECONDS * XRP_CONFIRM_WINDOW_MARGIN) /
	XRP_CONFIRM_MIN_POLL_SECONDS;

// The same give-up point expressed in time, because the attempt count alone does not bound one.
// Each attempt costs an interval plus however long its two requests take, and with
// `XRP_RPC_TIMEOUT_MS` per request the cap above can stretch to many times the window it was
// derived from — leaving the user on the CONFIRM step with no answer, definitive or otherwise.
//
// The window the attempt count was sized for, at the SLOWEST interval the loop can wait, so an
// ordinary send never reaches it: whichever of the two limits comes first ends the poll, and it
// should be the attempts whenever the node is answering at all.
export const XRP_CONFIRM_MAX_DURATION_MS =
	XRP_LAST_LEDGER_SEQUENCE_OFFSET * XRP_LEDGER_CLOSE_SECONDS * XRP_CONFIRM_WINDOW_MARGIN * 1000 +
	XRP_CONFIRM_MAX_ATTEMPTS * XRP_CONFIRM_MAX_POLL_MS;

// How far past `LastLedgerSequence` a validated index can legitimately have travelled by the time
// this poll reads it: the whole confirmation budget converted to ledger closes, plus the validity
// window itself. Beyond that the node is reporting something the ledger cannot have reached while
// we were watching, and refusing to conclude is the safe direction — the indeterminate path
// resubmits the same blob and lets the ledger decide, whereas expiry tells the caller to build a
// new transaction on a new sequence.
//
// `XrpLedgerCounterSchema` bounds the number system at `UInt32`; this bounds the ledger. The two
// are far apart: `0xFFFFFFFF` is around forty times the current mainnet index, so a value inside
// the protocol's range is still wildly outside this transaction's.
export const XRP_CONFIRM_MAX_LEDGER_LOOKAHEAD =
	XRP_CONFIRM_MAX_DURATION_MS / 1000 / XRP_LEDGER_CLOSE_SECONDS + XRP_LAST_LEDGER_SEQUENCE_OFFSET;
