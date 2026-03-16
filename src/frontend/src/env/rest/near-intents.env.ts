import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const NEAR_INTENTS_SWAP_ENABLED = LOCAL || STAGING;

export const NEAR_INTENTS_API_KEY = import.meta.env.VITE_NEAR_INTENTS_API_KEY;

export const NEAR_INTENTS_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://1click.chaindefuser.com/v0'
});
