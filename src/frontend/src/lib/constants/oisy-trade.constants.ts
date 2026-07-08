// Display name for the OISY Trade provider, shown on the Trading tab venue tag,
// order rows, deposit/withdraw flows, and as the `event_provider` in analytics.
export const OISY_TRADE_PROVIDER_NAME = 'OISY Trade';

// How often the Trading tab refreshes balances / pairs while visible.
// Mirrors the Liquidium polling cadence.
export const OISY_TRADE_POLL_INTERVAL_MILLIS = 30_000;

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
