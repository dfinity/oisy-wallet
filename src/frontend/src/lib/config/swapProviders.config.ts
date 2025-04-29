import { getIcpSwapAmounts } from '$lib/api/icp_swap.api';
import { kongSwapAmounts } from '$lib/api/kong_backend.api';
import { mapIcpSwapResult, mapKongSwapResult } from '$lib/utils/swap.utils';

import { ICP_SWAP_PROVIDER, KONG_SWAP_PROVIDER } from '$lib/constants/swap.constants';

import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { SwapProviderResult } from '$lib/stores/swap-amounts.store';
import type { ICPSwapRawResult, MapSwapQuoteParams, SwapQuoteParams } from '$lib/types/swap';

export interface SwapProvider<T> {
	id: string;
	getQuote: (params: SwapQuoteParams) => Promise<T>;
	mapQuoteResult: (params: MapSwapQuoteParams<T>) => SwapProviderResult;
}

export const kongSwapProvider: SwapProvider<SwapAmountsReply> = {
	id: KONG_SWAP_PROVIDER,
	getQuote: kongSwapAmounts,
	mapQuoteResult: ({ swap, tokens }: MapSwapQuoteParams<SwapAmountsReply>) =>
		mapKongSwapResult({ swap, tokens: tokens ?? [] })
};

export const icpSwapProvider: SwapProvider<ICPSwapRawResult> = {
	id: ICP_SWAP_PROVIDER,
	getQuote: getIcpSwapAmounts,
	mapQuoteResult: ({ swap, slippage }: MapSwapQuoteParams<ICPSwapRawResult>) => mapIcpSwapResult({ swap, slippage })
};

// export const swapProviders = [kongSwapProvider, icpSwapProvider] as const;

export const swapProviders = {
	[KONG_SWAP_PROVIDER]: kongSwapProvider,
	[ICP_SWAP_PROVIDER]: icpSwapProvider
};
