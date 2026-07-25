export const XRP_DERIVATION_PATH_PREFIX = 'XRP';

// XRPL account base reserve in drops (1 XRP = 1,000,000 drops). An account must retain
// at least this amount to remain on-ledger, so it is subtracted from the max sendable.
// This is the current network value; it is a validator-configurable amount.
export const XRP_BASE_RESERVE_DROPS = 1_000_000n;

// Fallback per-transaction fee in drops, used when the node's fee estimate is unavailable.
export const XRP_DEFAULT_FEE_DROPS = 10n;

// Ledgers added to the current index for a transaction's LastLedgerSequence, bounding how
// long it can be included (~4s/ledger, so ~80s) before it definitively fails rather than
// lingering.
export const XRP_LAST_LEDGER_SEQUENCE_OFFSET = 20;

// Seconds between the Unix epoch (1970-01-01) and the XRP Ledger epoch (2000-01-01).
// XRPL transaction `date` fields count from the ledger epoch; add this to get Unix time.
export const XRP_RIPPLE_EPOCH_OFFSET = 946_684_800;
