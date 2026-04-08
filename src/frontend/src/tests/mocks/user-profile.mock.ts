import type {
	Agreements,
	DappSettings,
	ExperimentalFeaturesSettings,
	NetworkSettings,
	NetworkSettingsFor,
	NetworksSettings,
	ProviderAgreementType,
	Settings,
	UserAgreement,
	UserProfile
} from '$declarations/backend/backend.did';
import type { UserProviderAgreements } from '$lib/types/user-provider-agreements';
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

export const mockExperimentalFeaturesSettings: ExperimentalFeaturesSettings = {
	experimental_features: [[{ AiAssistantBeta: null }, { enabled: true }]]
};

export const mockDappSettings: DappSettings = { dapp_carousel: { hidden_dapp_ids: [] } };

export const mockUserSettings: Settings = {
	networks: mockNetworksSettings,
	dapp: mockDappSettings,
	experimental_features: mockExperimentalFeaturesSettings
};

const mockUserAgreement: UserAgreement = {
	last_accepted_at_ns: toNullable(),
	last_updated_at_ms: toNullable(),
	text_sha256: toNullable(),
	accepted: toNullable()
};

export const mockProviderAgreementType: ProviderAgreementType = {
	provider: { NearIntents: null },
	scope: { Swap: null }
};

export const mockProviderAgreements: Array<[ProviderAgreementType, UserAgreement]> = [
	[mockProviderAgreementType, mockUserAgreement]
];

export const mockUserProviderAgreements: UserProviderAgreements = {
	'NearIntents-Swap': {
		accepted: undefined,
		lastAcceptedTimestamp: undefined,
		lastUpdatedTimestamp: undefined,
		textSha256: undefined
	}
};

export const mockDefinedUserProviderAgreements: UserProviderAgreements = {
	'NearIntents-Swap': {
		accepted: true,
		lastAcceptedTimestamp: 1677628801n,
		lastUpdatedTimestamp: 1677628800n,
		textSha256: 'abc123def456'
	}
};

export const mockUserAgreements: Agreements = {
	agreements: {
		license_agreement: mockUserAgreement,
		privacy_policy: mockUserAgreement,
		terms_of_use: mockUserAgreement
	},
	provider_agreements: toNullable()
};

export const mockDefinedUserAgreements: Agreements = {
	agreements: {
		license_agreement: {
			last_accepted_at_ns: toNullable(1677628801n),
			last_updated_at_ms: toNullable(1677628800n),
			text_sha256: toNullable('248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'),
			accepted: toNullable(true)
		},
		privacy_policy: {
			last_accepted_at_ns: toNullable(1677628801n),
			last_updated_at_ms: toNullable(1677628800n),
			text_sha256: toNullable('3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'),
			accepted: toNullable(true)
		},
		terms_of_use: {
			last_accepted_at_ns: toNullable(1677628801n),
			last_updated_at_ms: toNullable(1677628800n),
			text_sha256: toNullable('52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'),
			accepted: toNullable(true)
		}
	},
	provider_agreements: toNullable(mockProviderAgreements)
};

export const mockUserProfileVersion = 1n;

export const mockUserProfile: UserProfile = {
	version: toNullable(mockUserProfileVersion),
	settings: toNullable(mockUserSettings),
	agreements: toNullable(mockUserAgreements),
	created_timestamp: 1234n,
	updated_timestamp: 1234n
};
