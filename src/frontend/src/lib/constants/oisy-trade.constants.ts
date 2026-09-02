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

// Value-difference (%) below which a RESTING limit order (one that does not
// cross the book) is flagged as priced against the user — a Sell below current
// value, a Buy above it. Such an order still rests, but it sits on the side the
// market reaches first, so it is likely to fill soon at a worse price than the
// feed's. Matches the threshold at which the Review's value difference already
// turns amber, so the figure and the warning appear together.
export const LIMIT_ORDER_RESTING_VALUE_DIFFERENCE_WARNING_PERCENT = -1;
