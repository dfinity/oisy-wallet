import { ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS } from '$lib/constants/app.constants';

// The minter's name wherever a mint names who mints: a proper name, so not translated,
// like the swap providers' names.
export const CMC_NAME = 'Cycles Minting Canister';

// The CMC treats a deposit as a mint only when its memo is `MINT` (0x544e494d).
// An ICRC-1 transfer carries it as an 8-byte little-endian `icrc1_memo`, which
// the CMC reads whenever the legacy memo is zero.
export const CMC_MINT_CYCLES_MEMO = new Uint8Array([0x4d, 0x49, 0x4e, 0x54, 0, 0, 0, 0]);

// The cycles ledger counts in cycles, 10^12 to the TCYCLES, and keeps 0.0001 TCYCLES of
// every deposit as its fee (`dfinity/cycles-ledger`, `config.rs`). The CMC's `minted` is
// the amount before that fee.
export const CYCLES_LEDGER_DECIMALS = 12;
export const CYCLES_LEDGER_DEPOSIT_FEE = 100_000_000n;

// The smallest estimate the form lets through: twice the deposit fee, so the mint still
// clears the fee if the rate halves before the notify runs. An estimate below the fee is
// refunded minus 0.0003 ICP, which for amounts this small means nothing comes back.
export const CYCLES_MINT_MIN_ESTIMATE = 2n * CYCLES_LEDGER_DEPOSIT_FEE;

// How often the form re-reads the ICP/XDR rate. The CMC refreshes it every 5 minutes.
export const CYCLES_MINT_RATE_REFRESH_INTERVAL_MILLIS = 60_000;

// The foreground notifies this often before handing a mint to the background: the CMC
// usually answers within one call, and `Processing` clears in seconds.
export const CYCLES_MINT_NOTIFY_ATTEMPTS = 5;
export const CYCLES_MINT_NOTIFY_RETRY_DELAY_MILLIS = 2_000;

// How long after the row's transfer timestamp the foreground may still send the ICP. The
// row is opened first and carries the timestamp, so a tab suspended between the two would
// otherwise send it arbitrarily late; past this, the mint is abandoned before anything
// moves.
export const CYCLES_MINT_TRANSFER_START_WINDOW_NS = 60_000_000_000n;

// When a deposit that no tab saw land can no longer land: the start window, plus the
// 5-minute ingress expiry of the transfer call and the IC's 1-minute clock drift. The
// rest is margin for the poller's clock disagreeing with the clock that stamped the
// transfer, since that is the one comparison here that uses two devices' clocks. A row
// still without a deposit after this is deleted: nothing moved.
export const CYCLES_MINT_DEPOSIT_LANDING_WINDOW_NS = 15n * 60n * 1_000_000_000n;

// The ICP ledger accepts a `created_at_time` up to this far in its own future, so the
// deposit's block is never older than its transfer timestamp minus this. Walking the
// history back past that point cannot find it any more.
export const ICP_LEDGER_PERMITTED_DRIFT_NS = 60_000_000_000n;

export const CYCLES_MINT_DEPOSIT_LOOKUP_PAGE_SIZE = 100n;

// How long a row has to go unwritten before the poller acts on it, counted in the
// poller's own ticks (see `OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS` for why not in
// wall time). It keeps the poller from notifying or looking up while the modal that
// opened the row is still transferring and notifying. Acting early is harmless for a
// mint, since a notify is idempotent; the grace only saves duplicate calls.
export const CYCLES_MINT_SETTLE_GRACE_PERIOD_MILLIS = 60_000;

export const CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS = Math.ceil(
	CYCLES_MINT_SETTLE_GRACE_PERIOD_MILLIS / ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS
);
