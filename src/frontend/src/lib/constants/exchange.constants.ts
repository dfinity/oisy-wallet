import { SECONDS_IN_MINUTE } from '$lib/constants/app.constants';

/**
 * CoinGecko's public API offers cached values updated every 60 seconds (or every 30 seconds for Pro API users).
 * The CoinGecko Public API imposes a rate limit of 5 to 15 calls per minute, depending on global usage conditions.
 * Users can make transactions more frequently.
 * Since we make two API calls, refreshing every 30 seconds results in a maximum of 4 requests, keeping us just under the lower part of the limit.
 */
export const SYNC_EXCHANGE_TIMER_INTERVAL = (SECONDS_IN_MINUTE / 2) * 1000; // 30 seconds
