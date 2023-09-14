import eth from '$lib/assets/eth.svg';
import type { Token } from '$lib/types/token';

const SYMBOL = import.meta.env.VITE_ETHEREUM_SYMBOL;

export const ETHEREUM_TOKEN_ID = Symbol(SYMBOL);

export const ETHEREUM_TOKEN: Token = {
	id: ETHEREUM_TOKEN_ID,
	name: 'Ethereum',
	symbol: SYMBOL,
	decimals: 18,
	icon: eth
};

export const DEFAULT_CURRENCY = 'usd';
