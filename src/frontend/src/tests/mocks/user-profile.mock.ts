import type {
	Agreements,
	DappSettings,
	NetworkSettings,
	NetworkSettingsFor,
	NetworksSettings,
	Settings,
	UserAgreement,
	UserProfile
} from '$declarations/backend/backend.did';
import { toNullable } from '@dfinity/utils';

export const mockUserNetworksMap: Array<[NetworkSettingsFor, NetworkSettings]> = [
	[{ BitcoinMainnet: null }, { enabled: true, is_testnet: false }],
	[{ BitcoinTestnet: null }, { enabled: false, is_testnet: true }],
	[{ EthereumMainnet: null }, { enabled: true, is_testnet: false }],
	[{ EthereumSepolia: null }, { enabled: false, is_testnet: false }],
	[{ InternetComputer: null }, { enabled: true, is_testnet: false }],
	[{ InternetComputer: null }, { enabled: true, is_testnet: true }],
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

const mockUserAgreement: UserAgreement = {
	last_accepted_at_ns: toNullable(),
	last_updated_at_ms: toNullable(),
	accepted: toNullable()
};

export const mockUserAgreements: Agreements = {
	agreements: {
		license_agreement: mockUserAgreement,
		privacy_policy: mockUserAgreement,
		terms_of_use: mockUserAgreement
	}
};

export const mockUserProfileVersion = 1n;

export const mockUserProfile: UserProfile = {
	credentials: [],
	version: toNullable(mockUserProfileVersion),
	settings: toNullable(mockUserSettings),
	agreements: toNullable(mockUserAgreements),
	created_timestamp: 1234n,
	updated_timestamp: 1234n
};
