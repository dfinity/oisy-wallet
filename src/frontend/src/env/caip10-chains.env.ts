import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import { nonNullish } from '@dfinity/utils';

export const CAIP10_CHAINS: Record<
	string,
	{ chainId: string; name: string; network: SolanaNetworkType }
> = {
	...(nonNullish(SOLANA_MAINNET_NETWORK.chainId) && {
		[`solana:${SOLANA_MAINNET_NETWORK.chainId}`]: {
			chainId: SOLANA_MAINNET_NETWORK.chainId,
			name: SOLANA_MAINNET_NETWORK.name,
			network: SolanaNetworks.mainnet
		}
	}),
	...(nonNullish(SOLANA_TESTNET_NETWORK.chainId) && {
		[`solana:${SOLANA_TESTNET_NETWORK.chainId}`]: {
			chainId: SOLANA_TESTNET_NETWORK.chainId,
			name: SOLANA_TESTNET_NETWORK.name,
			network: SolanaNetworks.testnet
		}
	}),
	...(nonNullish(SOLANA_DEVNET_NETWORK.chainId) && {
		[`solana:${SOLANA_DEVNET_NETWORK.chainId}`]: {
			chainId: SOLANA_DEVNET_NETWORK.chainId,
			name: SOLANA_DEVNET_NETWORK.name,
			network: SolanaNetworks.devnet
		}
	})
};
