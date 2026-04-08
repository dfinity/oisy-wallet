import { KONGSWAP_PROVIDER_ENABLED } from '$env/rest/kongswap.env';
import { kongSwapAmounts } from '$lib/api/kong_backend.api';
import { icpSwapAmounts, icpSwapSupportedTokens } from '$lib/services/icp-swap.services';
import { kongSwapSupportedTokens } from '$lib/services/swap.services';
import { SwapProvider, type SwapProviderConfig } from '$lib/types/swap';
import { mapIcpSwapResult, mapKongSwapResult } from '$lib/utils/swap.utils';

export const swapProviders: SwapProviderConfig[] = [
	{
		key: SwapProvider.KONG_SWAP,
		getQuote: kongSwapAmounts,
		mapQuoteResult: ({ swap, tokens }) => mapKongSwapResult({ swap, tokens }),
		isEnabled: KONGSWAP_PROVIDER_ENABLED,
		getSupportedTokens: kongSwapSupportedTokens
	},
	{
		key: SwapProvider.ICP_SWAP,
		getQuote: icpSwapAmounts,
		mapQuoteResult: ({ swap, slippage, destToken }) =>
			mapIcpSwapResult({ swap, slippage, destToken }),
		isEnabled: true,
		getSupportedTokens: icpSwapSupportedTokens
	}
];
