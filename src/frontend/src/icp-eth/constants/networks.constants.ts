import eth from '$icp-eth/assets/eth.svg';
import icpLight from '$icp/assets/icp_light.svg';
import { LOCAL } from '$lib/constants/app.constants';
import type { Network } from '$lib/types/network';

/**
 * Ethereum
 */
export const ETHEREUM_NETWORK: Network = {
	id: Symbol('ETH'),
	name: 'Ethereum',
	icon: eth
};

export const { id: ETHEREUM_NETWORK_ID } = ETHEREUM_NETWORK;

export const SEPOLIA_NETWORK: Network = {
	id: Symbol('SepoliaETH'),
	name: 'Sepolia',
	icon: eth
};

export const { id: SEPOLIA_NETWORK_ID } = SEPOLIA_NETWORK;

export const ETHEREUM_NETWORKS: [...Network[], Network] = [
	...(LOCAL ? [] : [ETHEREUM_NETWORK]),
	SEPOLIA_NETWORK
];

export const ETHEREUM_NETWORKS_IDS: symbol[] = ETHEREUM_NETWORKS.map(({ id }) => id);

/**
 * ICP
 */
export const ICP_NETWORK_SYMBOL = 'ICP';

export const ICP_NETWORK_ID = Symbol(ICP_NETWORK_SYMBOL);

export const ICP_NETWORK: Network = {
	id: ICP_NETWORK_ID,
	name: 'Internet Computer',
	icon: icpLight
};
