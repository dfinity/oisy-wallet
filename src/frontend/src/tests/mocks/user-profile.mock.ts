import type {
	DappSettings,
	NetworksSettings,
	Settings,
	UserProfile
} from '$declarations/backend/backend.did';
import { toNullable } from '@dfinity/utils';

export const mockNetworksSettings: NetworksSettings = { testnets: { show_testnets: false } };

export const mockDappSettings: DappSettings = { dapp_carousel: { hidden_dapp_ids: [] } };

export const mockUserSettings: Settings = {
	networks: mockNetworksSettings,
	dapp: mockDappSettings
};

export const mockUserProfile: UserProfile = {
	credentials: [],
	version: [],
	settings: toNullable(mockUserSettings),
	created_timestamp: 1234n,
	updated_timestamp: 1234n
};
