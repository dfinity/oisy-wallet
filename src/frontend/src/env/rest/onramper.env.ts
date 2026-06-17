import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Feature flag: the OnRamper buy widget is enabled only on local and staging — not on beta nor
// production (ic). `STAGING` already covers the test_fe / audit / e2e environments.
export const ONRAMPER_ENABLED = LOCAL || STAGING;

// Optimistic fallback for the runtime `onramper_enabled` backend query: assume the widget is
// available when the query cannot be reached, since the widget self-disables on a missing secret.
export const BACKEND_ONRAMPER_ENABLED = true as boolean;

const ONRAMPER_ENV: 'dev' | 'prod' = LOCAL || STAGING ? 'dev' : 'prod';

export const isOnRamperDev = ONRAMPER_ENV === 'dev';

export const ONRAMPER_BASE_URL = isOnRamperDev
	? 'https://buy.onramper.dev'
	: 'https://buy.onramper.com';

export const ONRAMPER_API_KEY = isOnRamperDev
	? import.meta.env.VITE_ONRAMPER_API_KEY_DEV
	: import.meta.env.VITE_ONRAMPER_API_KEY_PROD;
