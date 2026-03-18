import type {
	NearIntentsQuote,
	NearIntentsQuoteResponse,
	NearIntentsStatusResponse,
	NearIntentsToken
} from '$lib/types/near-intents';

export const mockNearIntentsTokens: NearIntentsToken[] = [
	{
		assetId: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
		decimals: 6,
		blockchain: 'eth',
		symbol: 'USDC',
		price: 1.0,
		priceUpdatedAt: '2026-03-16T00:00:00.000Z',
		contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
	},
	{
		assetId: 'nep141:eth.omft.near',
		decimals: 18,
		blockchain: 'eth',
		symbol: 'ETH',
		price: 1947.28,
		priceUpdatedAt: '2026-03-16T00:00:00.000Z',
		contractAddress: null
	},
	{
		assetId: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
		decimals: 6,
		blockchain: 'arb',
		symbol: 'USDC',
		price: 1.0,
		priceUpdatedAt: '2026-03-16T00:00:00.000Z',
		contractAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
	},
	{
		assetId: 'nep141:wrap.near',
		decimals: 24,
		blockchain: 'near',
		symbol: 'wNEAR',
		price: 1.1,
		priceUpdatedAt: '2026-03-16T00:00:00.000Z',
		contractAddress: null
	}
];

export const mockNearIntentsQuote: NearIntentsQuote = {
	depositAddress: '0xDepositAddress123',
	depositMemo: null,
	amountIn: '1000000',
	amountInFormatted: '1.00',
	amountInUsd: '1.00',
	amountOut: '900000',
	amountOutFormatted: '0.90',
	amountOutUsd: '0.90',
	minAmountOut: '891000',
	deadline: '2026-03-16T00:10:00.000Z',
	timeWhenInactive: '2026-03-16T00:10:00.000Z',
	timeEstimate: 120,
	refundFee: '0'
};

export const mockNearIntentsQuoteResponse: NearIntentsQuoteResponse = {
	correlationId: 'mock-correlation-id',
	timestamp: '2026-03-16T00:00:00.000Z',
	signature: 'mock-signature',
	quoteRequest: {
		dry: true,
		swapType: 'EXACT_INPUT',
		slippageTolerance: 100,
		originAsset: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
		depositType: 'ORIGIN_CHAIN',
		destinationAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
		amount: '1000000',
		recipient: '0xUser',
		recipientType: 'DESTINATION_CHAIN',
		refundTo: '0xUser',
		refundType: 'ORIGIN_CHAIN',
		deadline: '2026-03-16T00:10:00.000Z'
	},
	quote: mockNearIntentsQuote
};

export const mockNearIntentsStatusSuccess: NearIntentsStatusResponse = {
	correlationId: 'mock-correlation-id',
	status: 'SUCCESS',
	updatedAt: '2026-03-16T00:02:00.000Z',
	quoteResponse: mockNearIntentsQuoteResponse,
	swapDetails: {
		amountIn: '1000000',
		amountInFormatted: '1.00',
		amountOut: '900000',
		amountOutFormatted: '0.90',
		originChainTxHashes: [{ hash: '0xTxHash123', explorerUrl: 'https://etherscan.io/tx/0x...' }],
		destinationChainTxHashes: [
			{ hash: '0xDestTxHash', explorerUrl: 'https://arbiscan.io/tx/0x...' }
		]
	}
};
