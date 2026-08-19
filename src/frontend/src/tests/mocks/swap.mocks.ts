import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import {
	SwapProvider,
	VeloraSwapTypes,
	type ChainFusionSwapDetails,
	type SwapMappedResult
} from '$lib/types/swap';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { mockVeloraDeltaPrice, mockVeloraOptimalRate } from '$tests/mocks/velora.mock';

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

export const mockVeloraMarketProvider: SwapMappedResult = {
	provider: SwapProvider.VELORA,
	receiveAmount: 900000000n,
	receiveOutMinimum: 891000000n,
	swapDetails: mockVeloraOptimalRate,
	type: VeloraSwapTypes.MARKET
};

export const mockVeloraDeltaProvider: SwapMappedResult = {
	provider: SwapProvider.VELORA,
	receiveAmount: 900000000n,
	receiveOutMinimum: 891000000n,
	swapDetails: mockVeloraDeltaPrice,
	type: VeloraSwapTypes.DELTA
};

export const mockNearIntentsProvider: SwapMappedResult = {
	provider: SwapProvider.NEAR_INTENTS,
	receiveAmount: 890000000n,
	swapDetails: mockNearIntentsQuoteResponse as NearIntentsQuoteResponse,
	type: undefined
};

export const mockOneSecProvider: SwapMappedResult = {
	provider: SwapProvider.ONE_SEC,
	receiveAmount: 880000000n,
	swapDetails: { transferFeeInUnits: 1000n, protocolFeeInPercent: 0.1 },
	type: undefined
};

export const mockChainFusionProvider = (
	swapDetails: ChainFusionSwapDetails = { sourceFees: [], externalFees: [] }
): SwapMappedResult => ({
	provider: SwapProvider.CHAIN_FUSION,
	receiveAmount: 870000000n,
	swapDetails,
	type: undefined
});
