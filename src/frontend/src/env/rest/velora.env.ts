import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const VELORA_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://api.paraswap.io'
});
