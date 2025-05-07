import { ICP_SWAP_ENABLED } from '$env/icp-swap.env';
import { kongSwapAmounts } from '$lib/api/kong_backend.api';
import { icpSwapAmounts } from '$lib/services/icp-swap.services';
import { SwapProvider, type IcpQuoteResult, type KongQuoteResult } from '$lib/types/swap';
import { mapIcpSwapResult, mapKongSwapResult } from '$lib/utils/swap.utils';

export const swapProviders = [
	{
		key: SwapProvider.KONG_SWAP,
		getQuote: kongSwapAmounts,
		mapQuoteResult: ({ swap, tokens }: KongQuoteResult) => mapKongSwapResult({ swap, tokens }),
		isEnabled: true
	},
	{
		key: SwapProvider.ICP_SWAP,
		getQuote: icpSwapAmounts,
		mapQuoteResult: ({ swap, slippage }: IcpQuoteResult) => mapIcpSwapResult({ swap, slippage }),
		isEnabled: ICP_SWAP_ENABLED
	}
] as const;
