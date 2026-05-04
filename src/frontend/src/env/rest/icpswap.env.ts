import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const ICPSWAP_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://api.icpswap.com'
});

export const ICPSWAP_PROVIDER_ENABLED = true;
