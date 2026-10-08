import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const COINGECKO_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://pro-api.coingecko.com/api/v3/'
});

export const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;

export const COINGECKO_PROVIDER_ENABLED = true;

// When the backend serves exchange rates, the frontend's missing-price fill skips
// CoinGecko (public API, rate-limited) and only runs the ICPSwap/Kong ICRC cascade.
// Flip in code to re-enable CoinGecko in that fill. The backend-OFF provider path
// and the FX cross-rate are governed by COINGECKO_PROVIDER_ENABLED above.
export const COINGECKO_FALLBACK_PROVIDER_ENABLED = false;
