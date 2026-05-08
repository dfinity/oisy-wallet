import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const EXCHANGE_DISABLED = parseBoolEnvVar(import.meta.env.VITE_EXCHANGE_DISABLED);

/**
 * Load token USD prices from the Oisy backend (cached canister HTTP outcalls) instead of
 * calling CoinGecko from the browser.
 *
 * Defaults to enabled on `local` and `staging`. Other networks default off unless
 * `VITE_BACKEND_EXCHANGE_ENABLED` is true. Set `VITE_BACKEND_EXCHANGE_DISABLED` to force off.
 */
export const BACKEND_EXCHANGE_ENABLED = ((): boolean => {
	if (parseBoolEnvVar(import.meta.env.VITE_BACKEND_EXCHANGE_DISABLED)) {
		return false;
	}

	if (parseBoolEnvVar(import.meta.env.VITE_BACKEND_EXCHANGE_ENABLED)) {
		return true;
	}

	return VITE_DFX_NETWORK === 'local' || VITE_DFX_NETWORK === 'staging';
})();
