import { UrlSchema } from '$lib/validation/url.validation';

const { success, data } = UrlSchema.safeParse('https://pro-api.coingecko.com/api/v3/');

export const COINGECKO_API_URL = success ? data : undefined;

export const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;
