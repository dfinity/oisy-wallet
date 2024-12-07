import { userSettings } from '$lib/derived/user-profile.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { get } from 'svelte/store';

describe('user-profile.derived', () => {
	describe('userSettings', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userSettings)).toBeUndefined();
		});

		it('should return user settings if they are not nullish', () => {
			userProfileStore.set({ certified: true, profile: mockUserProfile });

			expect(get(userSettings)).toEqual(mockUserSettings);
		});

		it('should return null if user settings are nullish', () => {
			userProfileStore.set({ certified: true, profile: { ...mockUserProfile, settings: [] } });

			expect(get(userSettings)).toBeNull();
		});
	});
});
