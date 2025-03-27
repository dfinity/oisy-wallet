import type { NetworkSettingsFor } from '$declarations/backend/backend.did';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import { SUPPORTED_MAINNET_NETWORKS_IDS } from '$env/networks/networks.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { userSettingsNetworks } from '$lib/derived/user-profile.derived';
import type { NetworkId } from '$lib/types/network';
import type { UserNetworks } from '$lib/types/user-networks';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userNetworks: Readable<UserNetworks> = derived(
	[userSettingsNetworks],
	([$userSettingsNetworks]) => {
		const userNetworks = $userSettingsNetworks?.networks;

		if (isNullish(userNetworks) || userNetworks.length === 0) {
			// Returning all mainnets enabled by default
			return SUPPORTED_MAINNET_NETWORKS_IDS.reduce<UserNetworks>(
				(acc, id) => ({
					...acc,
					[id]: { enabled: true, isTestnet: false }
				}),
				{}
			);
		}

		const keyToNetworkId = (key: NetworkSettingsFor): NetworkId => {
			const networkId: NetworkId | undefined =
				'InternetComputer' in key
					? ICP_NETWORK_ID
					: 'EthereumMainnet' in key
						? ETHEREUM_NETWORK_ID
						: 'EthereumSepolia' in key
							? SEPOLIA_NETWORK_ID
							: 'BitcoinMainnet' in key
								? BTC_MAINNET_NETWORK_ID
								: 'BitcoinTestnet' in key
									? BTC_TESTNET_NETWORK_ID
									: 'BitcoinRegtest' in key
										? BTC_REGTEST_NETWORK_ID
										: 'SolanaMainnet' in key
											? SOLANA_MAINNET_NETWORK_ID
											: 'SolanaTestnet' in key
												? SOLANA_TESTNET_NETWORK_ID
												: 'SolanaDevnet' in key
													? SOLANA_DEVNET_NETWORK_ID
													: 'SolanaLocal' in key
														? SOLANA_LOCAL_NETWORK_ID
														: undefined;

			if (isNullish(networkId)) {
				throw new Error(`Unknown network key: ${key}`);
			}

			return networkId;
		};

		return userNetworks.reduce<UserNetworks>((acc, [key, { enabled, is_testnet: isTestnet }]) => {
			const networkId: NetworkId = keyToNetworkId(key);
			return {
				...acc,
				[networkId]: { enabled, isTestnet }
			};
		}, {});
	}
);
