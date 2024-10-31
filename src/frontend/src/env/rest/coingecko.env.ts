import { UrlSchema } from '$lib/validation/url.validation';

export const COINGECKO_API_URL = UrlSchema.parse('https://pro-api.coingecko.com/api/v3/');

export const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;
