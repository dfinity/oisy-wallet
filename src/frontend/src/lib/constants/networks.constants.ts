import { ETHEREUM_NETWORKS } from '$env/networks.env';

export const [DEFAULT_NETWORK, _rest] = ETHEREUM_NETWORKS;
export const { id: DEFAULT_NETWORK_ID } = DEFAULT_NETWORK;
