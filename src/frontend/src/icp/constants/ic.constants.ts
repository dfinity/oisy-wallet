import { SECONDS_IN_MINUTE } from '$lib/constants/app.constants';

// From FI team:
// On mainnet, the index runs its indexing function every second. The time to see a new transaction in the index is <=1 second plus the time required by the indexing function
// (however)
// ICP Index has not been upgraded yet so right know for ICP is variable between 0 and 2 seconds. Leo has changed the ckBTC and ckETH to run every second and we want to change the ICP one too eventually. We just didn't get to work on it yet
export const INDEX_RELOAD_DELAY = 2000;

// Wallet
export const WALLET_TIMER_INTERVAL_MILLIS = (SECONDS_IN_MINUTE / 2) * 1000; // 30 seconds in milliseconds
export const WALLET_PAGINATION = 10n;
