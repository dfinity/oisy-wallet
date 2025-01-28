import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.env';

export const [DEFAULT_ETHEREUM_NETWORK, _rest] = SUPPORTED_ETHEREUM_NETWORKS;
export const { id: DEFAULT_NETWORK_ID } = DEFAULT_ETHEREUM_NETWORK;
