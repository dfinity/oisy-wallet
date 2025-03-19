import {
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_CHAIN_ID,
	SEPOLIA_NETWORK,
	SEPOLIA_NETWORK_CHAIN_ID
} from '$env/networks/networks.eth.env';

export const EIP155_CHAINS: Record<string, { chainId: number; name: string }> = {
	[`eip155:${ETHEREUM_NETWORK_CHAIN_ID}`]: {
		chainId: Number(ETHEREUM_NETWORK_CHAIN_ID),
		name: ETHEREUM_NETWORK.name
	},
	[`eip155:${SEPOLIA_NETWORK_CHAIN_ID}`]: {
		chainId: Number(SEPOLIA_NETWORK_CHAIN_ID),
		name: SEPOLIA_NETWORK.name
	}
};

export const EIP155_CHAINS_KEYS = Object.keys(EIP155_CHAINS);
