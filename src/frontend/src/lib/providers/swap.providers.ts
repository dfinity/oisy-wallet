import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import { kongSwapAmounts } from '$lib/api/kong_backend.api';
import { icpSwapAmounts } from '$lib/services/icp-swap.services';
import { SwapProvider, type ICPSwapResult, type Slippage } from '$lib/types/swap';
import { mapIcpSwapResult, mapKongSwapResult } from '$lib/utils/swap.utils';

type KongQuoteResult = {
	swap: SwapAmountsReply;
	tokens: IcToken[];
};

type IcpQuoteResult = {
	swap: ICPSwapResult;
	slippage: Slippage;
};

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
