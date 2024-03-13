import { ETHEREUM_NETWORK_CHAIN_ID, SEPOLIA_NETWORK_CHAIN_ID } from '$env/networks.env';

export const EIP155_CHAINS: Record<string, { chainId: number; name: string }> = {
	'eip155:1': {
		chainId: Number(ETHEREUM_NETWORK_CHAIN_ID),
		name: 'Ethereum'
	},
	'eip155:11155111': {
		chainId: Number(SEPOLIA_NETWORK_CHAIN_ID),
		name: 'Ethereum Sepolia'
	}
};
