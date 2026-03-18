import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

// Apparently we do not need an API keys for Near Intents, we can do unauthorised calls
export const NEAR_INTENTS_API_KEY = import.meta.env.VITE_NEAR_INTENTS_API_KEY;

export const NEAR_INTENTS_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://1click.chaindefuser.com/v0'
});
