// Display name for the OISY TRADE provider, shown on the Trading tab venue tag,
// order rows, and deposit/withdraw flows.
export const OISY_TRADE_PROVIDER_NAME = 'OISY TRADE';

// How often the Trading tab refreshes balances / pairs while visible.
// Mirrors the Liquidium polling cadence.
export const OISY_TRADE_POLL_INTERVAL_MILLIS = 30_000;

// "Learn more" destination for the Trading tab and deposit flow.
// TODO: point at the public OISY TRADE docs page once it exists.
export const OISY_TRADE_LEARN_MORE_URL = 'https://github.com/dfinity/oisy-trade';

// Value-difference (%) of a crossing limit order at/below which the give-up is
// "severe" — rendered red rather than amber (a >5% give-up vs current value).
export const LIMIT_ORDER_VALUE_DIFFERENCE_ERROR_PERCENT = -5;
