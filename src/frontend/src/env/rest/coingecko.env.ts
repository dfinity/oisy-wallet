import { UrlSchema } from '$lib/validation/url.validation';

const parsedCoingeckoApiUrl = UrlSchema.safeParse('https://pro-api.coingecko.com/api/v3/');

export const COINGECKO_API_URL = parsedCoingeckoApiUrl.success ? parsedCoingeckoApiUrl.data : '';

export const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;
