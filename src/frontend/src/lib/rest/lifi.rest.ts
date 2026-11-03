import { LIFI_API_KEY, LIFI_INTEGRATOR } from '$env/rest/lifi.env';
import { LIFI_QUOTE_TIMEOUT_MS, LIFI_STATUS_TIMEOUT_MS } from '$lib/constants/swap.constants';
import {
	createClient,
	getQuote,
	getStatus,
	type GetStatusRequestExtended,
	type LiFiStep,
	type QuoteRequestFromAmount,
	type SDKClient,
	type StatusResponse
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
		// Neither quotes nor statuses need a chain list, so none is fetched when the client is created.
		preloadChains: false
	});

	return client;
};

// https://docs.li.fi/api-reference/get-a-quote-for-a-token-transfer
//
// The SDK fills its defaults into the request object it is given, so the caller passes one it does
// not keep. The SDK sets no timeout of its own: without one, a stalled connection never settles. A
// caller making several requests in turn can pass one deadline for them all (`signal`), which is
// not part of the request sent.
//
// `async` so that a client that cannot be created (no integrator id) rejects rather than throws.
export const fetchLifiQuote = async ({
	signal = AbortSignal.timeout(LIFI_QUOTE_TIMEOUT_MS),
	...request
}: QuoteRequestFromAmount & { signal?: AbortSignal }): Promise<LiFiStep> =>
	await getQuote(lifiClient(), request, { signal });

// https://docs.li.fi/api-reference/check-the-status-of-a-cross-chain-transfer
//
// A transfer LI.FI does not know may come back as an HTTP 404 rather than as `NOT_FOUND`; the
// caller tells the two apart from other failures.
export const fetchLifiStatus = async (request: GetStatusRequestExtended): Promise<StatusResponse> =>
	await getStatus(lifiClient(), request, { signal: AbortSignal.timeout(LIFI_STATUS_TIMEOUT_MS) });
