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

// XRPL's `UInt32` ceiling. Named once because several distinct fields share it — a
// `DestinationTag`, a ledger index, a `LastLedgerSequence` — and a bare literal in each place
// would hide that they are the same protocol bound for the same reason.
// The largest number of drops that can exist: 10^17, the entire XRP supply of 100 billion XRP at
// 1,000,000 drops each. A protocol ceiling rather than a chosen one, and checked against
// `ripple-binary-codec` — an `Amount` of `100000000000000000` encodes, `100000000000000001` throws
// "is an illegal amount". Nothing larger can be a real value on any ledger, so a node reporting one
// is reporting a figure that inflates a displayed balance and, through `getXrpMaxAmount`, the
// reserve-aware maximum the send guard compares against.
export const XRP_MAX_DROPS = 100_000_000_000_000_000n;

export const XRP_MAX_UINT32 = 0xffff_ffff;

// A `DestinationTag` is a protocol `UInt32`, and both ends are real tags: `0` is a tag rather than
// an absent one, and so is the ceiling. Anything outside dies inside `ripple-binary-codec`, well
// past the point where the arguments could have said so.
export const XRP_MAX_DESTINATION_TAG = XRP_MAX_UINT32;

// `lsfRequireDestTag` in the AccountRoot flags: payments to this account must carry a
// `DestinationTag`. Set by exchanges and other shared accounts, where the tag is what credits the
// payment to a customer. A payment without one is applied as `tecDST_TAG_NEEDED` — the fee is
// destroyed and the sequence consumed — so it is refused before signing instead.
export const XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG = 0x00020000;

// Ledgers added to the current index for a transaction's LastLedgerSequence, bounding how
// long it can be included before it definitively fails rather than lingering.
//
// This governs SIGNING only. How far back a `tx` lookup searches is `XRP_LEDGER_SEARCH_LOOKBACK`
// below, deliberately a separate constant — see the reasoning there.
export const XRP_LAST_LEDGER_SEQUENCE_OFFSET = 20;

// How far below a blob's `LastLedgerSequence` a `tx` lookup starts searching.
//
// Separate from the offset above, and MUST NEVER DECREASE. The two answer different questions —
// how long a transaction stays valid, versus how far back we look for it — and a blob only encodes
// the first. `deriveXrpLedgerWindow` reconstructs the lower bound from a constant, so deriving it
// from the signing offset meant a *reduced* offset moved the bound for transactions signed under
// the old one: `min_ledger` above the index they were actually signed against, the node reporting
// `searched_all` over a range that excludes ledgers the payment could be in, and absence concluded
// from a search that never looked where it was. Past `LastLedgerSequence` that closes the record
// as expired — a definitive "it never landed" that invites a duplicate payment.
//
// A lower bound that is too LOW is not the mirror of one that is too high, which is why a fixed
// conservative value is a fix rather than a trade: it is a superset of the true window, so it can
// only make `searched_all` harder for the node to grant, leaving the outcome indeterminate and the
// poll running. Only a bound that is too high can manufacture a false absence.
//
// 100 is five times the current signing offset and ten times inside the ceiling: `tx` answers
// `excessiveLgrRange` above a 1000-ledger span, and the configured endpoint still returns
// `searched_all: true` at 20, 100, 500, 999 and 1000.
export const XRP_LEDGER_SEARCH_LOOKBACK = 100;

// Seconds between the Unix epoch (1970-01-01) and the XRP Ledger epoch (2000-01-01).
// XRPL transaction `date` fields count from the ledger epoch; add this to get Unix time.
export const XRP_RIPPLE_EPOCH_OFFSET = 946_684_800;

// Mainnet ledgers close on a ~4s cadence, so the offset above is a validity window of ~80s.
const XRP_LEDGER_CLOSE_SECONDS = 4;

// Deadline on every XRPL request, because `fetch` has none of its own: a connection that stalls
// instead of rejecting never settles. In a send that suspends the send indefinitely; in the
// resolver it is worse, because the active-transaction poller skips its ticks while one is in
// flight, so one hung lookup stops every flow's records from resolving, not only XRP's.
//
// Two ledger closes rather than a figure picked for feel: a request that outlives that cannot tell
// the poll anything the next one will not, since the ledger itself has moved on. Aborting makes a
// stall a rejected fetch, which the resolver already treats as an unanswered lookup: the record
// stays `Pending` and the next tick asks again.
export const XRP_RPC_TIMEOUT_MS = XRP_LEDGER_CLOSE_SECONDS * 2 * 1000;
