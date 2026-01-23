import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

// Kaspa public REST API endpoints
// Documentation: https://api.kaspa.org/docs

export const KASPA_API_URL_MAINNET = safeParse({
	schema: UrlSchema,
	value: 'https://api.kaspa.org'
});

export const KASPA_API_URL_TESTNET = safeParse({
	schema: UrlSchema,
	value: 'https://api-tn10.kaspa.org'
});
