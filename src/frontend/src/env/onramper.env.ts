import { LOCAL, STAGING } from '$lib/constants/app.constants';

export const ONRAMPER_BASE_URL =
	LOCAL || STAGING ? 'https://buy.onramper.dev' : 'https://buy.onramper.com';
