import { ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS } from '$lib/constants/app.constants';

// Display name for the OISY Trade provider, shown on the Trading tab venue tag,
// order rows, and deposit/withdraw flows.
export const OISY_TRADE_PROVIDER_NAME = 'OISY Trade';

// Stable analytics identifier for the OISY Trade provider (`event_provider`),
// mirroring how other providers keep a dedicated id (`SwapProvider`,
// `LIQUIDIUM_PROVIDER_ID`). Decoupled from OISY_TRADE_PROVIDER_NAME on purpose:
// a future UI-copy change must not silently move the Plausible dimension.
export const OISY_TRADE_ANALYTICS_PROVIDER_NAME = 'OISY Trade';

// How often the Trading tab refreshes balances / pairs while visible.
// Mirrors the Liquidium polling cadence.
export const OISY_TRADE_POLL_INTERVAL_MILLIS = 30_000;

// How often the swap flow re-reads a fill-or-kill order it has just placed, while
// the modal waits for it to settle. Deliberately much tighter than
// `OISY_TRADE_POLL_INTERVAL_MILLIS`, which paces a background refresh of a tab the
// user left open: a FOK order is decided in the matching round that follows it, and
// here somebody is watching a spinner for exactly this interval.
export const OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS = 2_000;

// How long the background poller leaves a swap row that has no order id alone.
//
// Load-bearing rather than a nicety: every healthy swap passes through exactly
// that signature in the window between the row's creation and `add_limit_order`
// returning, so a tick landing inside it would withdraw the deposit out from
// under an order placement still in flight. Comfortably longer than approve +
// deposit + place, and well short of the deposit's 5-minute approve expiry.
export const OISY_TRADE_SWAP_SETTLE_GRACE_PERIOD_MILLIS = 5 * 60 * 1000;

// That grace period as a count of the poller's own ticks, which is how it is
// actually measured.
//
// Not as elapsed wall time: the row's `created_at_ns` comes from the backend
// canister's clock while `Date.now()` comes from the browser's, and subtracting one
// from the other makes the window depend on the difference between them. A device
// clock five minutes fast collapses the budget to nothing, which would let a tick
// act while approve and deposit are still in flight; one behind holds recovery off
// for as long as it is behind. Counting the poller's own ticks needs neither clock.
export const OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS = Math.ceil(
	OISY_TRADE_SWAP_SETTLE_GRACE_PERIOD_MILLIS / ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS
);

// The oisy_trade canister caps a `get_my_orders` page (`ByPage.length`) at 100.
export const OISY_TRADE_ORDERS_PAGE_SIZE = 100;

// Newest-first pages of orders fetched per load, following the `ByPage` cursor:
// page size × this ≈ 500 orders — a safety bound so a large history can't loop
// unboundedly. Orders older than this are not surfaced (deeper history would
// need an explicit "load more").
export const OISY_TRADE_MAX_ORDER_PAGES = 5;

// "Learn more" destination for the Trading tab and deposit flow: the public
// OISY Trade docs page.
export const OISY_TRADE_LEARN_MORE_URL = 'https://docs.oisy.com/using-oisy-wallet/oisy-trade';

// Value-difference (%) of a crossing limit order at/below which the give-up is
// "severe" — rendered red rather than amber (a >5% give-up vs current value).
export const LIMIT_ORDER_VALUE_DIFFERENCE_ERROR_PERCENT = -5;
