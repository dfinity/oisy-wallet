import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const BLOCKCHAIN_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://blockchain.info'
});

export const BLOCKCHAIN_TESTNET_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://testnet.blockchain.info'
});
