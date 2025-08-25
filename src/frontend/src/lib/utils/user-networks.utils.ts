import type { NetworkSettings, NetworkSettingsFor } from '$declarations/backend/backend.did';
import {
	ARBITRUM_MAINNET_NETWORK_ID,
	ARBITRUM_SEPOLIA_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import {
	BASE_NETWORK_ID,
	BASE_SEPOLIA_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK_ID,
	BSC_TESTNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	POLYGON_AMOY_NETWORK_ID,
	POLYGON_MAINNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.polygon.env';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID, ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import type { NetworkId } from '$lib/types/network';
import type { UserNetworks } from '$lib/types/user-networks';
import { isNullish } from '@dfinity/utils';

const networkIdToKey = (networkId: NetworkId): NetworkSettingsFor | undefined => {
	switch (networkId) {
		case ICP_NETWORK_ID:
		case ICP_PSEUDO_TESTNET_NETWORK_ID:
			return { InternetComputer: null };
		case ETHEREUM_NETWORK_ID:
			return { EthereumMainnet: null };
		case SEPOLIA_NETWORK_ID:
			return { EthereumSepolia: null };
		case BTC_MAINNET_NETWORK_ID:
			return { BitcoinMainnet: null };
		case BTC_TESTNET_NETWORK_ID:
			return { BitcoinTestnet: null };
		case BTC_REGTEST_NETWORK_ID:
			return { BitcoinRegtest: null };
		case SOLANA_MAINNET_NETWORK_ID:
			return { SolanaMainnet: null };
		case SOLANA_DEVNET_NETWORK_ID:
			return { SolanaDevnet: null };
		case SOLANA_LOCAL_NETWORK_ID:
			return { SolanaLocal: null };
		case BASE_NETWORK_ID:
			return { BaseMainnet: null };
		case BASE_SEPOLIA_NETWORK_ID:
			return { BaseSepolia: null };
		case BSC_MAINNET_NETWORK_ID:
			return { BscMainnet: null };
		case BSC_TESTNET_NETWORK_ID:
			return { BscTestnet: null };
		case POLYGON_MAINNET_NETWORK_ID:
			return { PolygonMainnet: null };
		case POLYGON_AMOY_NETWORK_ID:
			return { PolygonAmoy: null };
		case ARBITRUM_MAINNET_NETWORK_ID:
			return { ArbitrumMainnet: null };
		case ARBITRUM_SEPOLIA_NETWORK_ID:
			return { ArbitrumSepolia: null };
		default:
			// We just print the error to console and ignore the missing network, for the sake of the user's experience.
			console.warn(`Unknown networkId: ${networkId.description}`);
	}
};

export const mapUserNetworks = (
	userNetworks: UserNetworks
): Array<[NetworkSettingsFor, NetworkSettings]> =>
	Object.getOwnPropertySymbols(userNetworks).reduce<Array<[NetworkSettingsFor, NetworkSettings]>>(
		(acc, networkId) => {
			const { enabled, isTestnet } = userNetworks[networkId as NetworkId];

			const key: NetworkSettingsFor | undefined = networkIdToKey(networkId as NetworkId);

			if (isNullish(key)) {
				return acc;
			}

			return [...acc, [key, { enabled, is_testnet: isTestnet }]];
		},
		[]
	);

export const isUserNetworkEnabled = ({
	userNetworks,
	networkId
}: {
	userNetworks: UserNetworks;
	networkId: NetworkId;
}): boolean => userNetworks[networkId]?.enabled ?? false;
