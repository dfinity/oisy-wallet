import { LIFI_API_KEY, LIFI_INTEGRATOR } from '$env/rest/lifi.env';
import {
	createClient,
	getQuote,
	type LiFiStep,
	type QuoteRequestFromAmount,
	type SDKClient
} from '@lifi/sdk';

let client: SDKClient | undefined;

// Created on first use rather than at import: `createClient` throws without an integrator id, which
// is set per environment.
const lifiClient = (): SDKClient => {
	client ??= createClient({
		integrator: LIFI_INTEGRATOR ?? '',
		apiKey: LIFI_API_KEY,
		// The version check reads `process.env.NODE_ENV`, which does not exist in the browser.
		disableVersionCheck: true,
		// Quotes need no chain list, so none is fetched when the client is created.
		preloadChains: false
	});

	return client;
};

// https://docs.li.fi/api-reference/get-a-quote-for-a-token-transfer
//
// The SDK fills its defaults into the request object it is given, so the caller passes one it does
// not keep.
export const fetchLifiQuote = (request: QuoteRequestFromAmount): Promise<LiFiStep> =>
	getQuote(lifiClient(), request);
