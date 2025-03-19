import { userProfileStore, type UserProfileStoreData } from '$lib/stores/user-profile.store';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { fromNullable, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

export const setupTestnetsStore = (value: 'enabled' | 'disabled' | 'reset') => {
	const userProfile: UserProfileStoreData = get(userProfileStore) ?? {
		profile: mockUserProfile,
		certified: false
	};

	const settings = fromNullable(userProfile.profile.settings) ?? mockUserSettings;

	userProfileStore.set({
		...userProfile,
		profile: {
			...userProfile.profile,
			settings: toNullable({
				...settings,
				networks: {
					...settings.networks,
					testnets: { ...settings.networks.testnets, show_testnets: value === 'enabled' }
				}
			})
		}
	});
};
