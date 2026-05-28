import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const EXCHANGE_DISABLED = parseBoolEnvVar(import.meta.env.VITE_EXCHANGE_DISABLED);

// Build-time fallback used until the backend's effective `exchange_rate_enabled` value
// has been fetched (see `loadBackendExchangeEnabled`). LOCAL/STAGING historically had
// CoinGecko API keys configured.
export const BACKEND_EXCHANGE_ENABLED = LOCAL || STAGING;
