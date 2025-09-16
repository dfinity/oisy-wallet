import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import { nonNullish } from '@dfinity/utils';

// Some DEXs still use the old CAIP10 chain ID for Solana networks
const LEGACY_SOLANA_MAINNET_CHAIN_ID = '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ';
export const LEGACY_SOLANA_MAINNET_NAMESPACE = `solana:${LEGACY_SOLANA_MAINNET_CHAIN_ID}`;
const LEGACY_SOLANA_DEVNET_CHAIN_ID = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
export const LEGACY_SOLANA_DEVNET_NAMESPACE = `solana:${LEGACY_SOLANA_DEVNET_CHAIN_ID}`;

export const CAIP10_CHAINS: Record<
	string,
	{ chainId: string; name: string; network: SolanaNetworkType }
> = {
	[`solana:${LEGACY_SOLANA_MAINNET_CHAIN_ID}`]: {
		chainId: LEGACY_SOLANA_MAINNET_CHAIN_ID,
		name: SOLANA_MAINNET_NETWORK.name,
		network: SolanaNetworks.mainnet
	},
	[`solana:${LEGACY_SOLANA_DEVNET_CHAIN_ID}`]: {
		chainId: LEGACY_SOLANA_DEVNET_CHAIN_ID,
		name: SOLANA_DEVNET_NETWORK.name,
		network: SolanaNetworks.devnet
	},
	...(nonNullish(SOLANA_MAINNET_NETWORK.chainId) && {
		[`solana:${SOLANA_MAINNET_NETWORK.chainId}`]: {
			chainId: SOLANA_MAINNET_NETWORK.chainId,
			name: SOLANA_MAINNET_NETWORK.name,
			network: SolanaNetworks.mainnet
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

const CAIP10_CHAINS_KEYS = Object.keys(CAIP10_CHAINS);

export const CAIP10_MAINNET_CHAINS_KEYS = CAIP10_CHAINS_KEYS.filter(
	(key) => CAIP10_CHAINS[key].network === SolanaNetworks.mainnet
);

export const CAIP10_DEVNET_CHAINS_KEYS = CAIP10_CHAINS_KEYS.filter(
	(key) => CAIP10_CHAINS[key].network === SolanaNetworks.devnet
);
