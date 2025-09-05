import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID, ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import type { UserNetworks } from '$lib/types/user-networks';

export const mockUserNetworks: UserNetworks = {
	[BTC_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false },
	[BTC_TESTNET_NETWORK_ID]: { enabled: false, isTestnet: true },
	[ETHEREUM_NETWORK_ID]: { enabled: true, isTestnet: false },
	[SEPOLIA_NETWORK_ID]: { enabled: false, isTestnet: false },
	[ICP_NETWORK_ID]: { enabled: true, isTestnet: false },
	[ICP_PSEUDO_TESTNET_NETWORK_ID]: { enabled: true, isTestnet: true },
	[SOLANA_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false },
	[SOLANA_DEVNET_NETWORK_ID]: { enabled: true, isTestnet: true }
};

export const mockUserNetworksOnlyMainnetsComplete: UserNetworks = {
	...SUPPORTED_NETWORKS.reduce<UserNetworks>(
		(acc, { id, env }) => ({
			...acc,
			...(env === 'mainnet' && {
				[id]: { enabled: true, isTestnet: false }
			})
		}),
		{}
	)
};

export const mockUserNetworksComplete: UserNetworks = {
	...SUPPORTED_NETWORKS.reduce<UserNetworks>(
		(acc, { id, env }) => ({
			...acc,
			[id]: { enabled: true, isTestnet: env === 'testnet' }
		}),
		{}
	)
};
