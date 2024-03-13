import { ETHEREUM_NETWORKS, ICP_NETWORK } from '$env/networks.env';
import type { Network } from '$lib/types/network';

export const [DEFAULT_NETWORK, _rest] = ETHEREUM_NETWORKS;
export const { id: DEFAULT_NETWORK_ID } = DEFAULT_NETWORK;

export const NETWORKS: Network[] = [...ETHEREUM_NETWORKS, ICP_NETWORK];
