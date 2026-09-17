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
export const XRP_LAST_LEDGER_SEQUENCE_OFFSET = 20;

// Mainnet ledgers close on a ~4s cadence, so the offset above is a validity window of ~80s.
const XRP_LEDGER_CLOSE_SECONDS = 4;

// Longest interval `randomWait` can return. Used to convert "ledger closes remaining" into "polls
// to wait": the LONGEST wait gives the FEWEST polls per close, so the conversion under-counts and
// the confirmation loop asks again slightly early rather than slightly late — a wasted call costs
// one request, asking late costs the definitive expiry answer.
const XRP_CONFIRM_MAX_POLL_SECONDS = 2;

// Polls to skip per ledger close still needed before expiry is even possible. Asking on every poll
// made almost every one of those calls incapable of changing the outcome: expiry needs the
// validated index to pass `LastLedgerSequence`, which is `XRP_LAST_LEDGER_SEQUENCE_OFFSET` closes
// away, while the poll runs three times as often as the ledger advances.
export const XRP_CONFIRM_POLLS_PER_LEDGER_CLOSE = Math.floor(
	XRP_LEDGER_CLOSE_SECONDS / XRP_CONFIRM_MAX_POLL_SECONDS
);

// Shortest interval `randomWait` can return, and so the conservative denominator below: the
// fastest polling needs the most attempts to span the window.
const XRP_CONFIRM_MIN_POLL_SECONDS = 1;

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
