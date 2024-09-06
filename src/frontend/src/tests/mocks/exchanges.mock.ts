import type { ExchangesData } from '$lib/types/exchange';
import { $tokens } from './tokens.mock';

export const usd = 1;

export const $exchanges: ExchangesData = $tokens.reduce<ExchangesData>((acc, token) => {
	acc[token.id] = { usd };
	return acc;
}, {});
