import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const BLOCKSTREAM_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://blockstream.info/api'
});

export const BLOCKSTREAM_TESTNET_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://blockstream.info/testnet/api'
});

export const BLOCKSTREAM_REGTEST_API_URL = safeParse({
	schema: UrlSchema,
	value: 'http://localhost:3000/api'
});
