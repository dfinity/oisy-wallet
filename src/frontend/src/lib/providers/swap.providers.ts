import { kongSwapAmounts } from '$lib/api/kong_backend.api';
import { icpSwapAmounts } from '$lib/services/icp-swap.services';
import { SwapProvider, type IcpQuoteResult, type KongQuoteResult } from '$lib/types/swap';
import { mapIcpSwapResult, mapKongSwapResult } from '$lib/utils/swap.utils';

export const swapProviders = [
	{
		key: SwapProvider.KONG_SWAP,
		getQuote: kongSwapAmounts,
		mapQuoteResult: ({ swap, tokens }: KongQuoteResult) => mapKongSwapResult({ swap, tokens })
	},
	{
		key: SwapProvider.ICP_SWAP,
		getQuote: icpSwapAmounts,
		mapQuoteResult: ({ swap, slippage }: IcpQuoteResult) => mapIcpSwapResult({ swap, slippage })
	}
] as const;
