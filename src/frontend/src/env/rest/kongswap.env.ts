import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const KONGSWAP_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://api.kongswap.io/api'
});
