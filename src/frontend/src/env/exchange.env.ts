import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const EXCHANGE_DISABLED = parseBoolEnvVar(import.meta.env.VITE_EXCHANGE_DISABLED);

// Environment gate for backend exchange mode, doubling as the build-time default until
// the backend's effective `exchange_rate_enabled` value has been fetched (see
// `loadBackendExchangeEnabled`). Backend mode is allowed on LOCAL/STAGING only (they
// historically had CoinGecko API keys configured); BETA/PROD always use the full
// frontend provider path, regardless of the canister's runtime flag.
export const BACKEND_EXCHANGE_ENABLED = LOCAL || STAGING;
