import type { UserProfile } from '$declarations/backend/backend.did';
import { toNullable } from '@dfinity/utils';

export const mockUserSettings = { dapp: { dapp_carousel: { hidden_dapp_ids: [] } } };

export const mockUserProfile: UserProfile = {
	credentials: [],
	version: [],
	settings: toNullable(mockUserSettings),
	created_timestamp: 1234n,
	updated_timestamp: 1234n
};
