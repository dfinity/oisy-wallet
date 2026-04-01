import type { IcpSwapToken } from '$lib/types/icpswap';

export const createMockIcpSwapToken = (
	overrides: Partial<IcpSwapToken> = {}
): IcpSwapToken => ({
	tokenLedgerId: 'aaaaa-aa',
	tokenName: 'Mock Token',
	tokenSymbol: 'MOCK',
	price: '1.230000000000000000',
	priceChange24H: '2.500000000000000000',
	tvlUSD: '250000.000000000000000000',
	tvlUSDChange24H: '1.000000000000000000',
	txCount24H: '100',
	volumeUSD24H: '50000.000000000000000000',
	volumeUSD7D: '350000.000000000000000000',
	totalVolumeUSD: '10000000.000000000000000000',
	priceLow24H: '1.100000000000000000',
	priceHigh24H: '1.350000000000000000',
	priceLow7D: '0.900000000000000000',
	priceHigh7D: '1.500000000000000000',
	priceLow30D: '0.700000000000000000',
	priceHigh30D: '1.800000000000000000',
	...overrides
});
