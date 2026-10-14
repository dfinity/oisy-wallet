import { LIFI_INTEGRATOR } from '$env/rest/lifi.env';
import { LIFI_QUOTE_REFRESH_INTERVAL_MS } from '$lib/constants/swap.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import { trackEvent } from '$lib/services/analytics.services';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import {
	SwapProvider,
	type EvmQuoteParams,
	type NearIntentsQuoteParams,
	type SwapMappedResult
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import {
	assertLifiQuote,
	buildLifiQuoteRequest,
	mapLifiSwapResult
} from '$lib/utils/lifi-swap.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import { HTTPError, SDKError, type QuoteRequestFromAmount } from '@lifi/sdk';
import { get } from 'svelte/store';

type LifiQuoteParams = EvmQuoteParams | NearIntentsQuoteParams;

interface LifiQuoteCacheEntry {
	key: string;
	requestedAt: number;
	result: Promise<SwapMappedResult | undefined>;
}

// A single entry: the swap form quotes one pair at a time, so a request with other inputs replaces
// it. Holding the promise rather than its result lets a request still in flight be shared.
let quoteCache: LifiQuoteCacheEntry | undefined;

export const resetLifiQuoteCache = () => {
	quoteCache = undefined;
};

const trackSwapOffer = ({
	sourceToken,
	destinationToken,
	amount,
	metadata
}: Pick<LifiQuoteParams, 'amount'> & {
	sourceToken: Token;
	destinationToken: Token;
	metadata: Record<string, string>;
}) => {
	const sourceTokenUsdValue = get(exchanges)?.[sourceToken.id]?.usd;

	trackEvent({
		name: PLAUSIBLE_EVENTS.SWAP_OFFER,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
			event_subcontext: SwapProvider.LIFI,
			token_symbol: sourceToken.symbol,
			token_network: sourceToken.network.name,
			token_name: sourceToken.name,
			token_standard: sourceToken.standard.code,
			token_id: String(sourceToken.id),
			token2_symbol: destinationToken.symbol,
			token2_network: destinationToken.network.name,
			token2_name: destinationToken.name,
			token2_standard: destinationToken.standard.code,
			token2_id: String(destinationToken.id),
			...(nonNullish(sourceTokenUsdValue) && {
				token_usd_value: `${sourceTokenUsdValue * Number(formatToken({ value: amount, unitName: sourceToken.decimals }))}`
			}),
			...metadata
		}
	});
};

// LI.FI's error text can carry the request URL, and with it the user's address, so only an
// allow-listed category and the HTTP status are reported.
const toSwapOfferError = (
	err: unknown
): { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES; status?: number } => {
	if (err instanceof LifiQuoteRejectedError) {
		return { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.QUOTE_REJECTED };
	}

	const status =
		err instanceof SDKError && err.cause instanceof HTTPError ? err.cause.status : undefined;

	// 404 is "no available quotes"; 422 is "none of the available routes could generate a
	// transaction" — both mean there is no route to offer.
	if (status === 404 || status === 422) {
		return { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.NO_ROUTE, status };
	}

	if (status === 429) {
		return { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.RATE_LIMITED, status };
	}

	return { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.REQUEST_FAILED, status };
};

const loadLifiSwapQuote = async ({
	request,
	sourceToken,
	destinationToken,
	amount
}: Pick<LifiQuoteParams, 'sourceToken' | 'destinationToken' | 'amount'> & {
	request: QuoteRequestFromAmount;
}): Promise<SwapMappedResult | undefined> => {
	try {
		// A copy, because the SDK fills its defaults into the object it is given.
		const quote = await fetchLifiQuote({ ...request });

		assertLifiQuote({ quote, request, sourceNetworkId: sourceToken.network.id });

		const result = mapLifiSwapResult(quote);

		const destinationUsdValue = get(exchanges)?.[destinationToken.id]?.usd;

		trackSwapOffer({
			sourceToken,
			destinationToken,
			amount,
			metadata: {
				result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				...(nonNullish(destinationUsdValue) && {
					token2_usd_value: `${destinationUsdValue * Number(formatToken({ value: result.receiveAmount, unitName: destinationToken.decimals }))}`
				})
			}
		});

		return result;
	} catch (err: unknown) {
		const { type, status } = toSwapOfferError(err);

		trackSwapOffer({
			sourceToken,
			destinationToken,
			amount,
			metadata: {
				result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				result_error_type: type,
				...(nonNullish(status) && { result_error_code: String(status) }),
				...(type === PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.QUOTE_REJECTED && {
					event_severity: PLAUSIBLE_EVENT_SEVERITIES.ERROR
				})
			}
		});
	}
};

/**
 * A LI.FI offer for the swap form's inputs, or `undefined` when LI.FI has none or is not asked.
 *
 * Unlike the other providers, LI.FI is not re-quoted on every periodic tick: a request with the same
 * inputs is answered from a single cache entry for `LIFI_QUOTE_REFRESH_INTERVAL_MS`, while any change
 * of inputs fetches immediately. Every outcome is cached, a missing route or a failure included, so
 * unchanged inputs reach LI.FI at most once per interval. The cached quote is only ever displayed:
 * execution re-quotes through the REST layer directly, never through this cache.
 */
export const fetchLifiSwapQuote = async (
	params: LifiQuoteParams
): Promise<SwapMappedResult | undefined> => {
	if (!notEmptyString(LIFI_INTEGRATOR)) {
		return;
	}

	const request = buildLifiQuoteRequest(params);

	if (isNullish(request)) {
		return;
	}

	const key = JSON.stringify(request);
	const now = Date.now();

	if (
		nonNullish(quoteCache) &&
		quoteCache.key === key &&
		now - quoteCache.requestedAt < LIFI_QUOTE_REFRESH_INTERVAL_MS
	) {
		return await quoteCache.result;
	}

	const { sourceToken, destinationToken, amount } = params;

	const result = loadLifiSwapQuote({ request, sourceToken, destinationToken, amount });

	quoteCache = { key, requestedAt: now, result };

	return await result;
};
