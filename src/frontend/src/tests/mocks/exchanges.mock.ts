import type { CoingeckoSimpleTokenPrice } from '$lib/types/coingecko';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';
import { mockTokens } from './tokens.mock';

export const mockOneUsd = 1;

export const mockExchanges: ExchangesData = mockTokens.reduce<ExchangesData>((acc, token) => {
	acc[token.id] = { usd: mockOneUsd };
	return acc;
}, {});

export const getMockExchanges = ({ token, usd }: { token: Token; usd: number }) => {
	const exchangeData = mockExchanges[token.id];
	if (!exchangeData) {
		return null;
	}
	exchangeData.usd = usd;
	return mockExchanges;
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

export const MOCK_CANISTER_ID_1 = 'aaaaa-aa';
export const MOCK_CANISTER_ID_2 = 'bbbbb-bb';
