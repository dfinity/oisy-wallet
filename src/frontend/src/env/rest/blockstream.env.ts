import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const BLOCKSTREAM_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://blockstream.info/api'
});
