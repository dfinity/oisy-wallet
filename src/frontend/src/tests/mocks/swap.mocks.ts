import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';

export const mockSwapProviders: SwapMappedResult[] = [
	{
		provider: SwapProvider.ICP_SWAP,
		receiveAmount: 1000000000n,
		receiveOutMinimum: 990000000n,
		swapDetails: {} as SwapMappedResult
	},
	{
		provider: SwapProvider.KONG_SWAP,
		receiveAmount: 2000000000n,
		slippage: 0.5,
		route: ['TokenA', 'TokenB'],
		liquidityFees: [
			{
				fee: 3000n,
				token: { symbol: 'ICP', decimals: 8 } as IcToken
			}
		],
		networkFee: {
			fee: 3000n,
			token: { symbol: 'ICP', decimals: 8 } as IcToken
		},
		swapDetails: {} as SwapAmountsReply
	}
];
