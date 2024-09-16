import { LOCAL, STAGING } from '$lib/constants/app.constants';

// TODO: to be removed when we have finished implementing all the OnRamper features
export const ONRAMPER_ENABLED = JSON.parse(import.meta.env.VITE_ONRAMPER_ENABLED ?? false) === true;

export const ONRAMPER_BASE_URL =
	LOCAL || STAGING ? 'https://buy.onramper.dev' : 'https://buy.onramper.com';
