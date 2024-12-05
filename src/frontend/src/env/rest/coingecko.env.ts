import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const COINGECKO_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://pro-api.coingecko.com/api/v3/'
});

export const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;
