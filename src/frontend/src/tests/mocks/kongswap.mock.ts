import type { KongSwapToken, KongSwapTokenMetrics } from '$lib/types/kongswap';

export const createMockKongSwapToken = ({
	token = {},
	metrics = {}
}: {
	canisterId?: string;
	token?: Partial<KongSwapToken['token']>;
	metrics?: Partial<KongSwapTokenMetrics>;
}): KongSwapToken => {
	const tokenDefaults = {
		token_id: 1,
		name: 'Mock Token',
		symbol: 'MOCK',
		canister_id: 'aaaaa-aa',
		address: '0xABC123',
		decimals: 8,
		fee: 0.0001,
		fee_fixed: '10',
		has_custom_logo: false,
		icrc1: true,
		icrc2: true,
		icrc3: false,
		is_removed: false,
		logo_url: null,
		logo_updated_at: '2024-01-01T00:00:00.000Z',
		token_type: 'Ic'
	};

	const metricsDefaults: KongSwapTokenMetrics = {
		token_id: 1,
		price: 1,
		market_cap: 1000000,
		volume_24h: 50000,
		price_change_24h: 2.5,
		updated_at: '2024-01-01T00:00:00.000Z',
		total_supply: 100000000,
		tvl: 250000,
		previous_price: 0.95,
		is_verified: true
	};

	return {
		token: { ...tokenDefaults, ...token },
		metrics: { ...metricsDefaults, ...metrics }
	};
};
