import { userSettingsNetworks } from '$lib/derived/user-networks.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockNetworksSettings, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { get } from 'svelte/store';

describe('user-networks.derived', () => {
	const certified = true;

	describe('userNetworksSettings', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();
			expect(get(userSettingsNetworks)).toBeUndefined();
		});

		it('should return user profile if it is not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });
			expect(get(userSettingsNetworks)).toEqual(mockNetworksSettings);
		});
	});
});
