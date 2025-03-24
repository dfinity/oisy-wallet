import type { CoingeckoSimpleTokenPrice } from '$lib/types/coingecko';
import type { ExchangesData } from '$lib/types/exchange';
import type { KongSwapToken, KongSwapTokenMetrics } from '$lib/types/kongswap';
import { mockTokens } from './tokens.mock';

export const mockOneUsd = 1;

export const mockExchanges: ExchangesData = mockTokens.reduce<ExchangesData>((acc, token) => {
	acc[token.id] = { usd: mockOneUsd };
	return acc;
}, {});

export const createMockKongSwapToken = (
	canisterId: string = 'test-canister-1',
	options: {
		token?: Partial<KongSwapToken['token']>;
		metrics?: Partial<KongSwapTokenMetrics>;
	} = {}
): KongSwapToken => {
	const tokenDefaults = {
		canister_id: canisterId,
		address: canisterId,
		name: 'Mock Token',
		symbol: 'MOCK',
		token_id: 1,
		decimals: 8,
		fee: 0.0001,
		fee_fixed: '10',
		has_custom_logo: false,
		icrc1: true,
		icrc2: true,
		icrc3: false,
		is_removed: false,
		logo_url: null,
		logo_updated_at: null,
		token_type: 'Ic'
	};

	const metricsDefaults: KongSwapTokenMetrics = {
		token_id: 1,
		price: '1.00',
		market_cap: '1000000',
		volume_24h: '50000',
		price_change_24h: '2.5',
		updated_at: '2024-01-01T00:00:00.000Z',
		total_supply: '100000000',
		tvl: '250000',
		previous_price: '0.95'
	};

	return {
		token: {
			...tokenDefaults,
			...(options.token ?? {})
		},
		metrics: {
			...metricsDefaults,
			...(options.metrics ?? {})
		}
	};
};

export const createMockCoingeckoTokenPrice = (
	overrides: Partial<CoingeckoSimpleTokenPrice> = {}
): CoingeckoSimpleTokenPrice => ({
	usd: 1.23,
	usd_market_cap: 123456,
	usd_24h_vol: 7890,
	usd_24h_change: -1.5,
	last_updated_at: Date.now(),
	...overrides
});
