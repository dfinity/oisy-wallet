import { LOCAL, STAGING } from '$lib/constants/app.constants';

// TODO: to be removed when we have finished implementing all the OnRamper features
export const ONRAMPER_ENABLED = JSON.parse(import.meta.env.VITE_ONRAMPER_ENABLED ?? false) === true;

const ONRAMPER_ENV: 'dev' | 'prod' = LOCAL || STAGING ? 'dev' : 'prod';

export const isOnRamperDev = ONRAMPER_ENV === 'dev';

export const ONRAMPER_BASE_URL = isOnRamperDev
	? 'https://buy.onramper.dev'
	: 'https://buy.onramper.com';

export const ONRAMPER_API_KEY = isOnRamperDev
	? import.meta.env.VITE_ONRAMPER_API_KEY_DEV
	: import.meta.env.VITE_ONRAMPER_API_KEY_PROD;
