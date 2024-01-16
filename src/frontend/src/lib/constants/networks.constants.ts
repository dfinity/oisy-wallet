import eth from '$lib/assets/eth.svg';
import icpLight from '$lib/assets/icp_light.svg';
import { PROD } from '$lib/constants/app.constants';
import type { Network } from '$lib/types/network';

/**
 * Ethereum
 */
export const ETHEREUM_NETWORK_SYMBOL = import.meta.env.VITE_ETHEREUM_SYMBOL;

export const ETHEREUM_NETWORK_ID = Symbol(ETHEREUM_NETWORK_SYMBOL);

export const ETHEREUM_NETWORK: Network = {
	id: ETHEREUM_NETWORK_ID,
	name: 'Ethereum',
	icon: eth
};

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

export const NETWORKS: Network[] = [ETHEREUM_NETWORK, ...(PROD ? [] : [ICP_NETWORK])];
