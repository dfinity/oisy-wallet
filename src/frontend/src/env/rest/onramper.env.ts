import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Feature flag: the OnRamper buy widget is enabled only on local and staging — not on beta nor
// production (ic). `STAGING` already covers the test_fe / audit / e2e environments.
export const ONRAMPER_ENABLED = LOCAL || STAGING;

// Pinned to production on every environment; kept as the wider union so the
// `isOnRamperDev` switch below stays intact should we ever need the sandbox again.
const ONRAMPER_ENV = 'prod' as 'dev' | 'prod';

export const isOnRamperDev = ONRAMPER_ENV === 'dev';

export const ONRAMPER_BASE_URL = isOnRamperDev
	? 'https://buy.onramper.dev'
	: 'https://buy.onramper.com';

export const ONRAMPER_API_KEY = isOnRamperDev
	? import.meta.env.VITE_ONRAMPER_API_KEY_DEV
	: import.meta.env.VITE_ONRAMPER_API_KEY_PROD;
