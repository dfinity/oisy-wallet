import eth from '$icp-eth/assets/eth.svg';
import type { Network } from '$lib/types/network';

export const ETHEREUM_NETWORK_SYMBOL = import.meta.env.VITE_ETHEREUM_SYMBOL;

export const ETHEREUM_NETWORK_ID = Symbol(ETHEREUM_NETWORK_SYMBOL);

export const ETHEREUM_NETWORK: Network = {
	id: ETHEREUM_NETWORK_ID,
	name: 'Ethereum',
	icon: eth
};
