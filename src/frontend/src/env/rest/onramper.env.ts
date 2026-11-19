import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';

// Feature flag: the OnRamper buy widget is enabled on every environment. Kept as the four terms
// rather than `true`, like `TIPS_ENABLED`: dropping `PROD` (or `BETA`) is the kill-switch.
// `STAGING` already covers the test_fe / audit / e2e environments.
export const ONRAMPER_ENABLED = LOCAL || STAGING || BETA || PROD;

// Set it to 'dev' to use OnRamper Sandbox
const ONRAMPER_ENV = 'prod';

export const isOnRamperDev = (ONRAMPER_ENV as 'dev' | 'prod') === 'dev';

export const ONRAMPER_BASE_URL = isOnRamperDev
	? 'https://buy.onramper.dev'
	: 'https://buy.onramper.com';

export const ONRAMPER_API_URL = isOnRamperDev
	? 'https://api-stg.onramper.com'
	: 'https://api.onramper.com';

export const ONRAMPER_API_KEY = isOnRamperDev
	? import.meta.env.VITE_ONRAMPER_API_KEY_DEV
	: import.meta.env.VITE_ONRAMPER_API_KEY_PROD;
