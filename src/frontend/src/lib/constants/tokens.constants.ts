import eth from '$lib/assets/eth.svg';
import icp from '$lib/assets/icp.svg';
import type { Token } from '$lib/types/token';

/**
 * Ethereum
 */
const ETHEREUM_SYMBOL = import.meta.env.VITE_ETHEREUM_SYMBOL;

export const ETHEREUM_TOKEN_ID = Symbol(ETHEREUM_SYMBOL);

export const ETHEREUM_TOKEN: Token = {
	id: ETHEREUM_TOKEN_ID,
	standard: 'ethereum',
	name: 'Ethereum',
	symbol: ETHEREUM_SYMBOL,
	decimals: 18,
	icon: eth
};

/**
 * ICP
 */
const ICP_SYMBOL = 'ICP';

export const ICP_TOKEN_ID = Symbol(ICP_SYMBOL);

export const ICP_TOKEN: Token = {
	id: ICP_TOKEN_ID,
	standard: 'icp',
	name: 'ICP',
	symbol: ICP_SYMBOL,
	decimals: 8,
	icon: icp
};
