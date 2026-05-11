import { LOCAL, STAGING } from '$lib/constants/app.constants';

// TODO: Enable (or remove this flag?) when OnRamper is functional again
export const ONRAMPER_ENABLED = false;

const ONRAMPER_ENV: 'dev' | 'prod' = LOCAL || STAGING ? 'dev' : 'prod';

export const isOnRamperDev = ONRAMPER_ENV === 'dev';

export const ONRAMPER_BASE_URL = isOnRamperDev
	? 'https://buy.onramper.dev'
	: 'https://buy.onramper.com';

export const ONRAMPER_API_KEY = isOnRamperDev
	? import.meta.env.VITE_ONRAMPER_API_KEY_DEV
	: import.meta.env.VITE_ONRAMPER_API_KEY_PROD;
