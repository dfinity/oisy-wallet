import { oisyTradeSwapEnabled } from '$env/oisy-trade-swap';
import { KONGSWAP_PROVIDER_ENABLED } from '$env/rest/kongswap.env';
import { kongSwapAmounts } from '$lib/api/kong_backend.api';
import { icpSwapAmounts, icpSwapSupportedTokens } from '$lib/services/icp-swap.services';
import { kongSwapSupportedTokens } from '$lib/services/kong-swap.services';
import {
	fetchOisyTradeQuote,
	loadOisyTradeSwapPairs,
	mapOisyTradeQuoteResult,
	oisyTradeSwapPairTable
} from '$lib/services/oisy-trade-swap.services';
import { SwapProvider, type SwapProviderConfig } from '$lib/types/swap';
import { oisyTradeCompatibleDestinations } from '$lib/utils/oisy-trade-swap.utils';
import { buildSymmetricSupportedDestinations } from '$lib/utils/swap-providers.utils';
import { mapIcpSwapResult, mapKongSwapResult } from '$lib/utils/swap.utils';

const symmetricIcpDestinations = buildSymmetricSupportedDestinations('icp');

export const swapProviders: SwapProviderConfig[] = [
	{
		key: SwapProvider.KONG_SWAP,
		getQuote: kongSwapAmounts,
		mapQuoteResult: ({ swap, tokens }) => mapKongSwapResult({ swap, tokens }),
		isEnabled: KONGSWAP_PROVIDER_ENABLED,
		getSupportedTokens: kongSwapSupportedTokens,
		getSupportedDestinations: symmetricIcpDestinations
	},
	{
		key: SwapProvider.ICP_SWAP,
		getQuote: icpSwapAmounts,
		mapQuoteResult: ({ swap, slippage, destToken }) =>
			mapIcpSwapResult({ swap, slippage, destToken }),
		isEnabled: true,
		getSupportedTokens: icpSwapSupportedTokens,
		getSupportedDestinations: symmetricIcpDestinations
	},
	{
		key: SwapProvider.OISY_TRADE,
		// The fan-out only carries offers, so a rejection collapses to `undefined`
		// here — which is why the service names no reason for one: nothing past this
		// boundary could read it, and the form explains an empty offer list from the
		// pair instead. A thrown failure — the depth query — is left to propagate, so
		// it lands in the per-provider `SWAP_OFFER` error analytics where an empty
		// result would hide it.
		//
		// This used to wrap the call in a `try/catch` that re-threw as a rejection,
		// because `fetchSwapAmountsICP` calls every `getQuote` inside a `.map()` and
		// only hands the resulting array to `Promise.allSettled` afterwards — so a
		// *synchronous* throw escaped the settling and rejected the whole fan-out,
		// taking ICPSwap's and KongSwap's offers with it. Now that the quote awaits
		// the order book it is an async function like its two siblings, which gives
		// it that containment for free.
		getQuote: async (params) => {
			const result = await fetchOisyTradeQuote(params);

			return result.ok ? result.quote : undefined;
		},
		mapQuoteResult: mapOisyTradeQuoteResult,
		isEnabled: oisyTradeSwapEnabled,
		// Fetches and caches; the sync `getSupportedDestinations` below then reads
		// that cache. `loadSwapSupportedTokens` awaits every `getSupportedTokens`
		// before any destination is computed, so the table is always populated by
		// the time the narrowing runs.
		getSupportedTokens: loadOisyTradeSwapPairs,
		// Directed, unlike its two siblings: a token's destinations are its pair
		// counterparts, not the whole supported set, so `buildSymmetricSupportedDestinations`
		// cannot serve here.
		getSupportedDestinations: ({ sourceToken }) =>
			oisyTradeCompatibleDestinations({ sourceToken, table: oisyTradeSwapPairTable() })
	}
];
