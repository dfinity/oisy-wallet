import type { NetworkSettingsFor } from '$declarations/backend/backend.did';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import {
	SUPPORTED_MAINNET_NETWORKS_IDS,
	SUPPORTED_TESTNET_NETWORKS_IDS,
	USER_NETWORKS_FEATURE_ENABLED
} from '$env/networks/networks.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userSettingsNetworks } from '$lib/derived/user-profile.derived';
import type { NetworkId } from '$lib/types/network';
import type { UserNetworks } from '$lib/types/user-networks';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userNetworks: Readable<UserNetworks> = derived(
	[userSettingsNetworks, testnetsEnabled],
	([$userSettingsNetworks, $testnetsEnabled]) => {
		const userNetworks = $userSettingsNetworks?.networks;

		if (isNullish(userNetworks) || userNetworks.length === 0 || !USER_NETWORKS_FEATURE_ENABLED) {
			// Returning all mainnets (and testnets if enabled) by default
			return {
				...SUPPORTED_MAINNET_NETWORKS_IDS.reduce<UserNetworks>(
					(acc, id) => ({ ...acc, [id]: { enabled: true, isTestnet: false } }),
					{}
				),
				...($testnetsEnabled &&
					SUPPORTED_TESTNET_NETWORKS_IDS.reduce<UserNetworks>(
						(acc, id) => ({ ...acc, [id]: { enabled: $testnetsEnabled, isTestnet: true } }),
						{}
					))
			};
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

		return {
			...userNetworks.reduce<UserNetworks>((acc, [key, { enabled, is_testnet: isTestnet }]) => {
				const networkId: NetworkId = keyToNetworkId(key);
				return { ...acc, [networkId]: { enabled, isTestnet } };
			}, {}),
			// We always enable ICP network.
			[ICP_NETWORK_ID]: { enabled: true, isTestnet: false }
		};
	}
);
