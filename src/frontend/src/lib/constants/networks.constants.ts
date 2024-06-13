import { CHAIN_FUSION_NETWORKS, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks.env';

// TODO: remove SUPPORTED_ETHEREUM_NETWORKS fallback when we have finished implementing the single-page view with Chain Fusion
export const [DEFAULT_NETWORK, _rest] = [...CHAIN_FUSION_NETWORKS, ...SUPPORTED_ETHEREUM_NETWORKS];
export const { id: DEFAULT_NETWORK_ID } = DEFAULT_NETWORK;
