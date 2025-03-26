import type {
	DappSettings,
	NetworkSettings,
	NetworkSettingsFor,
	NetworksSettings,
	Settings,
	UserProfile
} from '$declarations/backend/backend.did';
import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import type { UserNetworks } from '$lib/types/user-networks';
import { toNullable } from '@dfinity/utils';

export const mockUserNetworksMap: Array<[NetworkSettingsFor, NetworkSettings]> = [
	[{ BitcoinMainnet: null }, { enabled: true, is_testnet: false }],
	[{ BitcoinTestnet: null }, { enabled: false, is_testnet: true }],
	[{ EthereumMainnet: null }, { enabled: true, is_testnet: false }],
	[{ EthereumSepolia: null }, { enabled: false, is_testnet: false }],
	[{ InternetComputer: null }, { enabled: true, is_testnet: false }],
	[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }],
	[{ SolanaDevnet: null }, { enabled: true, is_testnet: true }]
];




export const mockNetworksSettings: NetworksSettings = {
	networks: mockUserNetworksMap,
	testnets: { show_testnets: false }
};

export const mockDappSettings: DappSettings = { dapp_carousel: { hidden_dapp_ids: [] } };

export const mockUserSettings: Settings = {
	networks: mockNetworksSettings,
	dapp: mockDappSettings
};

export const mockUserProfileVersion = 1n;

export const mockUserProfile: UserProfile = {
	credentials: [],
	version: toNullable(mockUserProfileVersion),
	settings: toNullable(mockUserSettings),
	created_timestamp: 1234n,
	updated_timestamp: 1234n
};
