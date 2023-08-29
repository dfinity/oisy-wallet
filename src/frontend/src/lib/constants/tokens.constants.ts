import type { Token } from '$lib/types/token';

const SYMBOL = import.meta.env.VITE_ETHEREUM_SYMBOL;

export const ETHEREUM_TOKEN_ID = Symbol(SYMBOL);

export const ETHEREUM_TOKEN: Token = {
	id: ETHEREUM_TOKEN_ID,
	name: 'Ethereum',
	symbol: SYMBOL,
	decimals: 18
};
