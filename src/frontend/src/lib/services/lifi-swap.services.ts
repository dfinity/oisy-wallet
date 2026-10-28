import { LIFI_INTEGRATOR } from '$env/rest/lifi.env';
import {
	LIFI_QUOTE_REFRESH_INTERVAL_MS,
	LIFI_QUOTE_TIMEOUT_MS
} from '$lib/constants/swap.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { tokens } from '$lib/derived/tokens.derived';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import { trackEvent } from '$lib/services/analytics.services';
import { loadLifiSolQuoteCeiling } from '$lib/services/lifi-sol-transaction.services';
import {
	LifiQuoteRejectedError,
	LifiRouteUnsupportedError,
	SwapViaIntermediateTokenError
} from '$lib/types/errors';
import type { LifiTokenRef } from '$lib/types/lifi';
import type { NetworkId } from '$lib/types/network';
import {
	SwapProvider,
	type EvmQuoteParams,
	type NearIntentsQuoteParams,
	type SwapMappedResult
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { isLifiRouteExecutable } from '$lib/utils/lifi-calldata.utils';
import {
	assertLifiQuote,
	buildLifiQuoteRequest,
	findLifiIntermediateToken,
	findLifiListedToken,
	mapLifiSwapResult
} from '$lib/utils/lifi-swap.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import {
	ChainId,
	HTTPError,
	SDKError,
	type LiFiStep,
	type QuoteRequestFromAmount
} from '@lifi/sdk';
import { get } from 'svelte/store';

type LifiQuoteParams = EvmQuoteParams | NearIntentsQuoteParams;

// What LI.FI answered for the inputs: an offer or, without one, the in-between token of a route OISY
// could not take, for the two-swap hint.
interface LifiQuoteOutcome {
	offer?: SwapMappedResult;
	intermediateToken?: LifiTokenRef;
}

interface LifiQuoteCacheEntry {
	key: string;
	result: Promise<LifiQuoteOutcome>;
	// Set once `result` settles. The refresh interval runs from the answer, not from the request,
	// so a request still in flight is always shared, however long it takes.
	settledAt?: number;
}

// A single entry: the swap form quotes one pair at a time, so a request with other inputs replaces
// it. Holding the promise rather than its result lets a request still in flight be shared.
let quoteCache: LifiQuoteCacheEntry | undefined;

const isFresh = ({ settledAt }: LifiQuoteCacheEntry): boolean =>
	isNullish(settledAt) || Date.now() - settledAt < LIFI_QUOTE_REFRESH_INTERVAL_MS;

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

const SWAP_OFFER_ERROR_SEVERITIES: Partial<
	Record<PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES, PLAUSIBLE_EVENT_SEVERITIES>
> = {
	// The response may have been forged or intercepted.
	[PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.QUOTE_REJECTED]: PLAUSIBLE_EVENT_SEVERITIES.ERROR,
	// Repeated, these are a LI.FI outage. A missing route is a normal answer and has no severity.
	[PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.RATE_LIMITED]: PLAUSIBLE_EVENT_SEVERITIES.WARN,
	[PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.TIMEOUT]: PLAUSIBLE_EVENT_SEVERITIES.WARN,
	[PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.REQUEST_FAILED]: PLAUSIBLE_EVENT_SEVERITIES.WARN
};

// LI.FI's error text can carry the request URL, and with it the user's address, so only an
// allow-listed category and the HTTP status are reported.
const toSwapOfferError = (
	err: unknown
): { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES; status?: number } => {
	if (err instanceof LifiQuoteRejectedError) {
		return { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.QUOTE_REJECTED };
	}

	// No route OISY can execute is no route at all, unless the re-quote without its bridge failed for
	// a reason of its own.
	if (err instanceof LifiRouteUnsupportedError) {
		return nonNullish(err.cause)
			? toSwapOfferError(err.cause)
			: { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.NO_ROUTE };
	}

	// `LIFI_QUOTE_TIMEOUT_MS` aborts the fetch, and the SDK wraps that abort as it does any error.
	if (
		err instanceof SDKError &&
		err.cause instanceof DOMException &&
		err.cause.name === 'TimeoutError'
	) {
		return { type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.TIMEOUT };
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

const fetchTrustedLifiQuote = async ({
	request,
	sourceNetworkId,
	signal
}: {
	request: QuoteRequestFromAmount;
	sourceNetworkId: NetworkId;
	signal: AbortSignal;
}): Promise<LiFiStep> => {
	// A copy, because the SDK fills its defaults into the object it is given.
	const quote = await fetchLifiQuote({ ...request, signal });

	assertLifiQuote({ quote, request, sourceNetworkId });

	return quote;
};

/**
 * A trusted quote whose route the binding could accept, with the request it answers.
 *
 * A Solana source's transaction is read as its binding reads it, which also gives the LI.FI ceiling
 * the form budgets (`loadLifiSolQuoteCeiling`).
 *
 * When an EVM source's best route goes through a bridge in a shape the calldata binding refuses
 * (Across behind a DEX swap, or any bridge followed by another step), LI.FI is asked once more
 * without that bridge, so that another allowed one can serve the pair; that request is the one
 * execution re-quotes with. Both requests share the caller's deadline: the form waits for every
 * provider's answer.
 *
 * When there is no such route, the refused one travels with the `LifiRouteUnsupportedError`, for the
 * two-swap hint.
 */
const fetchExecutableLifiQuote = async ({
	request,
	sourceNetworkId,
	signal
}: {
	request: QuoteRequestFromAmount;
	sourceNetworkId: NetworkId;
	signal: AbortSignal;
}): Promise<{ quote: LiFiStep; request: QuoteRequestFromAmount; solFeeCeiling?: bigint }> => {
	const quote = await fetchTrustedLifiQuote({ request, sourceNetworkId, signal });

	if (request.fromChain === ChainId.SOL) {
		return { quote, request, solFeeCeiling: await loadLifiSolQuoteCeiling({ quote, request }) };
	}

	if (isLifiRouteExecutable(quote)) {
		return { quote, request };
	}

	const bridge = quote.includedSteps.find(({ type }) => type === 'cross')?.tool;
	const allowBridges = request.allowBridges ?? [];
	const otherBridges = allowBridges.filter((key) => key !== bridge);

	if (
		isNullish(bridge) ||
		otherBridges.length === allowBridges.length ||
		otherBridges.length === 0
	) {
		throw new LifiRouteUnsupportedError(`LI.FI route via ${bridge} cannot be executed`, {
			route: quote
		});
	}

	const withoutBridge = { ...request, allowBridges: otherBridges };

	let fallback: LiFiStep;

	try {
		fallback = await fetchTrustedLifiQuote({ request: withoutBridge, sourceNetworkId, signal });
	} catch (err: unknown) {
		throw new LifiRouteUnsupportedError(`LI.FI route without ${bridge} could not be quoted`, {
			route: quote,
			cause: err
		});
	}

	if (!isLifiRouteExecutable(fallback)) {
		throw new LifiRouteUnsupportedError(`LI.FI route without ${bridge} cannot be executed`, {
			route: quote
		});
	}

	return { quote: fallback, request: withoutBridge };
};

/**
 * The in-between token of LI.FI's route for the pair, for the two-swap hint: read from the route
 * OISY refused or, when LI.FI answered with no route at all, from the one it has once steps after
 * the bridge are allowed, asked within the same deadline. Only a quote that passes the trust checks
 * counts, and only for that token: its route is never shown nor signed.
 */
const loadLifiIntermediateToken = async ({
	err,
	request,
	sourceNetworkId,
	signal
}: {
	err: unknown;
	request: QuoteRequestFromAmount;
	sourceNetworkId: NetworkId;
	signal: AbortSignal;
}): Promise<LifiTokenRef | undefined> => {
	if (err instanceof LifiRouteUnsupportedError) {
		return nonNullish(err.route) ? findLifiIntermediateToken(err.route) : undefined;
	}

	// Only a pair between two EVM networks has an in-between token (see `findLifiIntermediateToken`),
	// and only a missing route is worth asking about again.
	if (
		request.fromChain === request.toChain ||
		request.toChain === ChainId.SOL ||
		toSwapOfferError(err).type !== PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.NO_ROUTE
	) {
		return;
	}

	try {
		const quote = await fetchTrustedLifiQuote({
			request: { ...request, allowDestinationCall: true },
			sourceNetworkId,
			signal
		});

		return isLifiRouteExecutable(quote) ? undefined : findLifiIntermediateToken(quote);
	} catch (_: unknown) {
		// Without an answer, there is only no hint.
	}
};

const loadLifiSwapQuote = async ({
	request,
	sourceToken,
	destinationToken,
	amount
}: Pick<LifiQuoteParams, 'sourceToken' | 'destinationToken' | 'amount'> & {
	request: QuoteRequestFromAmount;
}): Promise<LifiQuoteOutcome> => {
	const sourceNetworkId = sourceToken.network.id;
	const signal = AbortSignal.timeout(LIFI_QUOTE_TIMEOUT_MS);

	try {
		const offer = mapLifiSwapResult(
			await fetchExecutableLifiQuote({ request, sourceNetworkId, signal })
		);

		const destinationUsdValue = get(exchanges)?.[destinationToken.id]?.usd;

		trackSwapOffer({
			sourceToken,
			destinationToken,
			amount,
			metadata: {
				result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				...(nonNullish(destinationUsdValue) && {
					token2_usd_value: `${destinationUsdValue * Number(formatToken({ value: offer.receiveAmount, unitName: destinationToken.decimals }))}`
				})
			}
		});

		return { offer };
	} catch (err: unknown) {
		const { type, status } = toSwapOfferError(err);
		const severity = SWAP_OFFER_ERROR_SEVERITIES[type];

		trackSwapOffer({
			sourceToken,
			destinationToken,
			amount,
			metadata: {
				result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				result_error_type: type,
				...(nonNullish(status) && { result_error_code: String(status) }),
				...(nonNullish(severity) && { event_severity: severity })
			}
		});

		return {
			intermediateToken: await loadLifiIntermediateToken({
				err,
				request,
				sourceNetworkId,
				signal
			})
		};
	}
};

/**
 * The offer, if LI.FI has one. Without one, a route through a token OISY lists rejects with
 * `SwapViaIntermediateTokenError`, the reason the swap form gives for the missing offer. The token is
 * looked up on every answer, cached or not, so that it follows the tokens OISY lists.
 */
const toLifiSwapQuoteResult = ({
	offer,
	intermediateToken
}: LifiQuoteOutcome): SwapMappedResult | undefined => {
	if (nonNullish(offer) || isNullish(intermediateToken)) {
		return offer;
	}

	const listedToken = findLifiListedToken({ tokens: get(tokens), token: intermediateToken });

	if (nonNullish(listedToken)) {
		throw new SwapViaIntermediateTokenError({
			intermediateToken: listedToken,
			provider: SwapProvider.LIFI
		});
	}
};

/**
 * A LI.FI offer for the swap form's inputs, or `undefined` when LI.FI has none or is not asked.
 * Without an offer, it rejects with `SwapViaIntermediateTokenError` when LI.FI's route goes through
 * one token OISY lists in a shape OISY cannot verify: the user can make the swap as two separate
 * swaps through that token.
 *
 * Unlike the other providers, LI.FI is not re-quoted on every periodic tick: a request with the same
 * inputs is answered from a single cache entry, while any change of inputs fetches immediately. A
 * request still in flight is shared; once it settles, its answer is reused for
 * `LIFI_QUOTE_REFRESH_INTERVAL_MS`. Every outcome is cached, a missing route or a failure included,
 * so unchanged inputs are quoted at most once per interval. The cached quote is only ever displayed:
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

	if (nonNullish(quoteCache) && quoteCache.key === key && isFresh(quoteCache)) {
		return toLifiSwapQuoteResult(await quoteCache.result);
	}

	const { sourceToken, destinationToken, amount } = params;

	const entry: LifiQuoteCacheEntry = {
		key,
		result: loadLifiSwapQuote({ request, sourceToken, destinationToken, amount })
	};

	quoteCache = entry;

	// `loadLifiSwapQuote` never rejects, so this always records when the answer arrived.
	const outcome = await entry.result;

	entry.settledAt = Date.now();

	return toLifiSwapQuoteResult(outcome);
};
