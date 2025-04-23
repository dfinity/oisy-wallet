import type { NetworkSettingsFor } from '$declarations/backend/backend.did';
import {
	BASE_NETWORK_ID,
	BASE_SEPOLIA_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK_ID,
	BSC_TESTNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import {
	SUPPORTED_MAINNET_NETWORKS_IDS,
	SUPPORTED_TESTNET_NETWORKS_IDS
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

		if (isNullish(userNetworks) || userNetworks.length === 0) {
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
			if ('InternetComputer' in key) {
				return ICP_NETWORK_ID;
			}
			if ('EthereumMainnet' in key) {
				return ETHEREUM_NETWORK_ID;
			}
			if ('EthereumSepolia' in key) {
				return SEPOLIA_NETWORK_ID;
			}
			if ('BitcoinMainnet' in key) {
				return BTC_MAINNET_NETWORK_ID;
			}
			if ('BitcoinTestnet' in key) {
				return BTC_TESTNET_NETWORK_ID;
			}
			if ('BitcoinRegtest' in key) {
				return BTC_REGTEST_NETWORK_ID;
			}
			if ('SolanaMainnet' in key) {
				return SOLANA_MAINNET_NETWORK_ID;
			}
			if ('SolanaTestnet' in key) {
				return SOLANA_TESTNET_NETWORK_ID;
			}
			if ('SolanaDevnet' in key) {
				return SOLANA_DEVNET_NETWORK_ID;
			}
			if ('SolanaLocal' in key) {
				return SOLANA_LOCAL_NETWORK_ID;
			}
			if ('BaseMainnet' in key) {
				return BASE_NETWORK_ID;
			}
			if ('BaseSepolia' in key) {
				return BASE_SEPOLIA_NETWORK_ID;
			}
			if ('BscMainnet' in key) {
				return BSC_MAINNET_NETWORK_ID;
			}
			if ('BscTestnet' in key) {
				return BSC_TESTNET_NETWORK_ID;
			}

			// Force compiler error on unhandled cases based on leftover types
			const _: never = key;

			throw new Error(`Unknown network key: ${key}`);
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
