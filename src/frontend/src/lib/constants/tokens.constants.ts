import eth from '$lib/assets/eth.svg';
import icpLight from '$lib/assets/icp_light.svg';
import { ETHEREUM_NETWORK, ICP_NETWORK } from '$lib/constants/networks.constants';
import type { Token } from '$lib/types/token';

/**
 * Ethereum
 */
const ETHEREUM_SYMBOL = import.meta.env.VITE_ETHEREUM_SYMBOL;

export const ETHEREUM_TOKEN_ID = Symbol(ETHEREUM_SYMBOL);

export const ETHEREUM_TOKEN: Required<Token> = {
	id: ETHEREUM_TOKEN_ID,
	network: ETHEREUM_NETWORK,
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

export const ICP_TOKEN: Required<Token> = {
	id: ICP_TOKEN_ID,
	network: ICP_NETWORK,
	standard: 'icp',
	name: 'ICP',
	symbol: ICP_SYMBOL,
	decimals: 8,
	icon: icpLight
};
