import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Feature flag: the OnRamper buy widget is enabled only on local and staging — not on beta nor
// production (ic). `STAGING` already covers the test_fe / audit / e2e environments.
export const ONRAMPER_ENABLED = LOCAL || STAGING;

// Every environment targets the OnRamper production environment; the dev/sandbox
// (buy.onramper.dev) is never used.
export const ONRAMPER_BASE_URL = 'https://buy.onramper.com';

export const ONRAMPER_API_KEY = import.meta.env.VITE_ONRAMPER_API_KEY_PROD;
