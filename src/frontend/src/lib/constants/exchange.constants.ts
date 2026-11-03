import { BACKEND_EXCHANGE_ENABLED } from '$env/exchange.env';
import { BETA, MILLISECONDS_IN_DAY, PROD, SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { Currency } from '$lib/enums/currency';
import type { XdrBasketCurrency } from '$lib/types/exchange';

/**
 * CoinGecko's public API offers cached values updated every 60 seconds (or every 30 seconds for Pro API users).
 * The CoinGecko Public API imposes a rate limit of 5 to 15 calls per minute, depending on global usage conditions.
 *
 * While the limitations of Coingecko appeared suitable for our initial use case involving two calls (ETH and ERC20), in practice, we've observed that Coingecko frequently generates errors.
 * As a result, we've restricted synchronization to refresh every certain amount of time.
 *
 * When the backend exchange refresh is enabled, the frontend can safely fetch more frequently
 * because the backend already caches exchange rates at a controlled interval.
 * This allows the frontend to simply retrieve cached data without increasing load on external APIs.
 *
 * Outside production and beta, the frontend provider path syncs every 30 minutes instead of 5 to save CoinGecko
 * monthly quota: the other deployments do not need fresh prices.
 */
export const getSyncExchangeTimerInterval = (backendEnabled: boolean): number =>
	backendEnabled
		? SECONDS_IN_MINUTE * 1000 // 1 minute
		: PROD || BETA
			? SECONDS_IN_MINUTE * 1000 * 5 // 5 minutes
			: SECONDS_IN_MINUTE * 1000 * 30; // 30 minutes

/**
 * @deprecated Prefer `getSyncExchangeTimerInterval(runtimeFlag)`. Kept as a build-time default
 * for callers that do not yet thread the runtime backend flag.
 */
export const SYNC_EXCHANGE_TIMER_INTERVAL = getSyncExchangeTimerInterval(BACKEND_EXCHANGE_ENABLED);

/**
 * The IMF's XDR basket: the amount of each currency in one XDR, for the valuation period from
 * 2022-08-01 to 2027-07-31. 1 TCYCLES is worth 1 XDR, so this basket prices it.
 *
 * @link {https://www.imf.org/en/topics/special-drawing-right/sdr-valuation-basket}
 */
export const XDR_BASKET: Readonly<Record<XdrBasketCurrency, number>> = {
	[Currency.USD]: 0.57813,
	[Currency.EUR]: 0.37379,
	[Currency.CNY]: 1.0993,
	[Currency.JPY]: 13.452,
	[Currency.GBP]: 0.08087
};

// The basket's currencies other than USD, each valued in USD through BTC's price in it.
export const XDR_BASKET_NON_USD_CURRENCIES = [
	Currency.EUR,
	Currency.CNY,
	Currency.JPY,
	Currency.GBP
] as const satisfies readonly XdrBasketCurrency[];

export const XDR_BASKET_CURRENCIES = [
	Currency.USD,
	...XDR_BASKET_NON_USD_CURRENCIES
] as const satisfies readonly XdrBasketCurrency[];

// The next basket applies from this date, and the IMF fixes its amounts only on the business day
// before, so updating `XDR_BASKET` is a code change that cannot ship much earlier.
export const XDR_BASKET_EXPIRY_MS = Date.UTC(2027, 7, 1);

// TCYCLES keeps this basket's price until then. The next basket is worth the same on its first day
// and drifts away slowly, so two months cost around 0.01% while the new amounts ship. From this
// date on, TCYCLES has no price rather than a wrong one.
export const XDR_BASKET_GRACE_END_MS = Date.UTC(2027, 9, 1);

// The countdown event starts one week before the basket expires.
export const XDR_BASKET_COUNTDOWN_START_MS = XDR_BASKET_EXPIRY_MS - 7 * MILLISECONDS_IN_DAY;
