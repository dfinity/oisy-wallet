import { RIFT_BTC_ASSET_ID, RIFT_INTEGRATOR_ID } from '$env/rest/rift.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ZERO } from '$lib/constants/app.constants';
import { RIFT_QUOTE_REFRESH_INTERVAL_MS } from '$lib/constants/swap.constants';
import { postRiftQuote } from '$lib/rest/rift.rest';
import type { RiftQuote, RiftQuoteRequest } from '$lib/types/rift';
import {
	SwapProvider,
	type BtcQuoteParams,
	type GetSupportedDestinationsFn,
	type SwapMappedResult
} from '$lib/types/swap';
import { isRiftBtcSource, isRiftQuoteForRequest, toRiftAssetId } from '$lib/utils/rift.utils';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

interface RiftQuoteCacheEntry {
	key: string;
	// `undefined` when Rift gave no usable answer: no route, an error, or a request superseded by a
	// newer one before it was sent.
	quote: Promise<RiftQuote | undefined>;
	// Set once `quote` settles. The refresh interval runs from the answer, not from the request, so a
	// request still waiting for the limiter or in flight is always shared.
	settledAt?: number;
}

// A single entry, as LI.FI's: the swap form quotes one pair at a time, so a request with other
// inputs replaces it.
let quoteCache: RiftQuoteCacheEntry | undefined;

const isFresh = ({ settledAt }: RiftQuoteCacheEntry): boolean =>
	isNullish(settledAt) || Date.now() - settledAt < RIFT_QUOTE_REFRESH_INTERVAL_MS;

export const resetRiftQuoteCache = () => {
	quoteCache = undefined;
};

const loadRiftQuote = async (request: RiftQuoteRequest): Promise<RiftQuote | undefined> => {
	try {
		return await postRiftQuote(request);
	} catch (_: unknown) {
		// A 422 is Rift's "no route". Until its text for a too-small amount is known, it is not told
		// apart from a failure, a timeout or a superseded request: each is simply no offer.
		return undefined;
	}
};

const fetchRiftQuote = async (request: RiftQuoteRequest): Promise<RiftQuote | undefined> => {
	const key = JSON.stringify(request);

	if (nonNullish(quoteCache) && quoteCache.key === key && isFresh(quoteCache)) {
		return quoteCache.quote;
	}

	const entry: RiftQuoteCacheEntry = { key, quote: loadRiftQuote(request) };

	quoteCache = entry;

	// `loadRiftQuote` never rejects, so this always records when the answer arrived.
	const quote = await entry.quote;

	entry.settledAt = Date.now();

	return quote;
};

/**
 * The BTC sources Rift may quote, keyed as the swap source filter keys them: native BTC on mainnet.
 */
export const riftBtcSupportedTokens = (): Promise<Set<string>> =>
	Promise.resolve(
		new Set([resolveSwapTokenLookup({ token: BTC_MAINNET_TOKEN })?.identifier].filter(nonNullish))
	);

/**
 * The `getSupportedDestinations` of the BTC registry's Rift entry: every EVM token, which Rift quotes
 * toward with no list of its own, from native BTC only. A token on a network Rift is not asked about
 * gets no offer.
 */
export const riftBtcSupportedDestinations: GetSupportedDestinationsFn = ({ sourceToken }) =>
	isRiftBtcSource(sourceToken) ? { evm: 'any' } : undefined;

/**
 * A Rift offer for a swap from native BTC to a token on an EVM network Rift is asked about, or
 * `undefined` when there is none.
 *
 * Rift is re-quoted at most every `RIFT_QUOTE_REFRESH_INTERVAL_MS` for unchanged inputs, while any
 * change of inputs asks at once; every outcome is cached, no offer included. The rate itself is kept
 * by the limiter in `rift.rest.ts`. A quote is checked against the request before it is shown
 * (`isRiftQuoteForRequest`), and dropped silently otherwise.
 *
 * The offer has no minimum: Rift swaps at whatever price it finds once the deposit arrives.
 */
export const fetchRiftBtcSwapQuote = async ({
	sourceToken,
	destinationToken,
	amount,
	onProviderParticipating
}: BtcQuoteParams): Promise<SwapMappedResult | undefined> => {
	const from = toRiftAssetId(sourceToken);
	const to = toRiftAssetId(destinationToken);

	if (from !== RIFT_BTC_ASSET_ID || isNullish(to) || to === RIFT_BTC_ASSET_ID || amount <= ZERO) {
		return;
	}

	const request: RiftQuoteRequest = {
		from,
		to,
		amount_in: `${amount}`,
		format: 'raw',
		quote_mode: 'fast',
		integrator_id: RIFT_INTEGRATOR_ID
	};

	onProviderParticipating?.(SwapProvider.RIFT);

	const quote = await fetchRiftQuote(request);

	if (isNullish(quote) || !isRiftQuoteForRequest({ quote, request, now: Date.now() })) {
		return;
	}

	return {
		provider: SwapProvider.RIFT,
		receiveAmount: BigInt(quote.estimated_amount_out),
		swapDetails: quote
	};
};
