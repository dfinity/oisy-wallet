import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';

export const CAIP10_CHAINS: Record<string, { chainId: string; name: string }> = {
	[`solana:${SOLANA_MAINNET_NETWORK.chainId}`]: {
		chainId: SOLANA_MAINNET_NETWORK.chainId,
		name: SOLANA_MAINNET_NETWORK.name
	},
	[`solana:${SOLANA_TESTNET_NETWORK.chainId}`]: {
		chainId: SOLANA_TESTNET_NETWORK.chainId,
		name: SOLANA_TESTNET_NETWORK.name
	},
	[`solana:${SOLANA_DEVNET_NETWORK.chainId}`]: {
		chainId: SOLANA_DEVNET_NETWORK.chainId,
		name: SOLANA_DEVNET_NETWORK.name
	}
};

export const CAIP10_CHAINS_KEYS = Object.keys(CAIP10_CHAINS);
