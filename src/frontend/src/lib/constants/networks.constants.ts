import eth from '$lib/assets/eth.svg';
import icp from '$lib/assets/icp.svg';
import type { Network } from '$lib/types/network';

/**
 * Ethereum
 */
const ETHEREUM_NETWORK_SYMBOL = import.meta.env.VITE_ETHEREUM_SYMBOL;

export const ETHEREUM_NETWORK_ID = Symbol(ETHEREUM_NETWORK_SYMBOL);

export const ETHEREUM_NETWORK: Network = {
	id: ETHEREUM_NETWORK_ID,
	name: 'Ethereum',
	icon: eth
};

/**
 * ICP
 */
const ICP_NETWORK_SYMBOL = 'ICP';

export const ICP_NETWORK_ID = Symbol(ICP_NETWORK_SYMBOL);

export const ICP_NETWORK: Network = {
	id: ICP_NETWORK_ID,
	name: 'Internet Computer',
	icon: icp
};

export const NETWORKS: Network[] = [ETHEREUM_NETWORK, ICP_NETWORK];
