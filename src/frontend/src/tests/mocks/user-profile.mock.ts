import type { UserProfile } from '$declarations/backend/backend.did';

export const mockUserProfile: UserProfile = {
	credentials: [],
	version: [],
	settings: { dapp: { dapp_carousel: { hidden_dapp_ids: [] } } },
	created_timestamp: 1234n,
	updated_timestamp: 1234n
};
