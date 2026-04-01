import { BACKEND_EXCHANGE_ENABLED } from '$env/exchange.env';
import { SECONDS_IN_MINUTE } from '$lib/constants/app.constants';

/**
 * CoinGecko's public API offers cached values updated every 60 seconds (or every 30 seconds for Pro API users).
 * The CoinGecko Public API imposes a rate limit of 5 to 15 calls per minute, depending on global usage conditions.
 *
 * While the limitations of Coingecko appeared suitable for our initial use case involving two calls (ETH and ERC20), in practice, we've observed that Coingecko frequently generates errors.
 * As a result, we've restricted synchronization to refresh every certain amount of time.
 *
 * When BACKEND_EXCHANGE_ENABLED is true, the frontend can safely fetch more frequently
 * because the backend already caches exchange rates at a controlled interval.
 * This allows the frontend to simply retrieve cached data without increasing load on external APIs.
 */
export const SYNC_EXCHANGE_TIMER_INTERVAL = BACKEND_EXCHANGE_ENABLED
	? SECONDS_IN_MINUTE * 1000 // 1 minute
	: SECONDS_IN_MINUTE * 1000 * 5; // 5 minutes
