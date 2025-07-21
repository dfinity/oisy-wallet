import { kongSwapAmounts } from '$lib/api/kong_backend.api';
import { icpSwapAmounts } from '$lib/services/icp-swap.services';
import { SwapProvider, type SwapProviderConfig } from '$lib/types/swap';
import { mapIcpSwapResult, mapKongSwapResult } from '$lib/utils/swap.utils';

export const swapProviders: SwapProviderConfig[] = [
	{
		key: SwapProvider.KONG_SWAP,
		getQuote: kongSwapAmounts,
		mapQuoteResult: ({ swap, tokens }) => mapKongSwapResult({ swap, tokens }),
		isEnabled: true
	},
	{
		key: SwapProvider.ICP_SWAP,
		getQuote: icpSwapAmounts,
		mapQuoteResult: ({ swap, slippage }) => mapIcpSwapResult({ swap, slippage }),
		isEnabled: true
	}
];
