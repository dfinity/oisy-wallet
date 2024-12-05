import type { ExchangesData } from '$lib/types/exchange';
import { mockTokens } from './tokens.mock';

export const mockOneUsd = 1;

export const mockExchanges: ExchangesData = mockTokens.reduce<ExchangesData>((acc, token) => {
	acc[token.id] = { usd: mockOneUsd };
	return acc;
}, {});
