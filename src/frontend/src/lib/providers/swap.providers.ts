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
		// The quote itself is synchronous — it reads the cached pair table — so the
		// registry's async contract is satisfied here rather than inside it. The
		// fan-out only carries offers, so a rejection collapses to `undefined` at
		// this boundary; its `errorKind` stays on the service for the form's
		// empty-offer-list explanation.
		//
		// The catch is load-bearing rather than defensive. `fetchSwapAmountsICP`
		// calls every `getQuote` inside a `.map()` and only hands the resulting
		// array to `Promise.allSettled` afterwards, so a *synchronous* throw here
		// would escape the settling and reject the whole fan-out — taking ICPSwap's
		// and KongSwap's offers down with it. Those two are async functions, which
		// gives them this containment for free; a sync quote has to ask for it.
		// Rejecting rather than swallowing keeps a genuine failure in the per-provider
		// `SWAP_OFFER` error analytics, where an empty result would hide it.
		getQuote: (params) => {
			try {
				const result = fetchOisyTradeQuote(params);

				return Promise.resolve(result.ok ? result.quote : undefined);
			} catch (err: unknown) {
				return Promise.reject(err);
			}
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
