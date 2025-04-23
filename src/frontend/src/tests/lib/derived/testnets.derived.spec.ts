import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('testnets.derived', () => {
	const certified = true;

	describe('testnets', () => {
		it('should return false when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(testnetsEnabled)).toBeFalsy();
		});

		it('should return false when settings are not set', () => {
			userProfileStore.set({ certified, profile: { ...mockUserProfile, settings: [] } });

			expect(get(testnetsEnabled)).toBeFalsy();
		});

		it('should return the value of show testnets settings', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						networks: { ...mockNetworksSettings, testnets: { show_testnets: true } }
					})
				}
			});

			expect(get(testnetsEnabled)).toBeTruthy();

			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						networks: { ...mockNetworksSettings, testnets: { show_testnets: false } }
					})
				}
			});

			expect(get(testnetsEnabled)).toBeFalsy();
		});
	});
});
