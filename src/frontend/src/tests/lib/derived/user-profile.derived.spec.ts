import {
	userAgreementsData,
	userProfile,
	userProfileLoaded,
	userProfileVersion,
	userSettings,
	userSettingsNetworks
} from '$lib/derived/user-profile.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import {
	mockNetworksSettings,
	mockUserAgreements,
	mockUserProfile,
	mockUserProfileVersion,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { get } from 'svelte/store';

describe('user-profile.derived', () => {
	const certified = true;

	describe('userProfileLoaded', () => {
		it('should return false when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userProfileLoaded)).toBeFalsy();
		});

		it('should return true when user profile is set', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userProfileLoaded)).toBeTruthy();
		});
	});

	describe('userProfile', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userProfile)).toBeUndefined();
		});

		it('should return user profile if it is not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userProfile)).toEqual(mockUserProfile);
		});
	});

	describe('userProfileVersion', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userProfileVersion)).toBeUndefined();
		});

		it('should return user profile version if it is not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userProfileVersion)).toEqual(mockUserProfileVersion);
		});

		it('should return undefined if user profile version is nullish', () => {
			userProfileStore.set({ certified, profile: { ...mockUserProfile, version: [] } });

			expect(get(userProfileVersion)).toBeUndefined();
		});
	});

	describe('userSettings', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userSettings)).toBeUndefined();
		});

		it('should return user settings if they are not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userSettings)).toEqual(mockUserSettings);
		});

		it('should return undefined if user settings are nullish', () => {
			userProfileStore.set({ certified, profile: { ...mockUserProfile, settings: [] } });

			expect(get(userSettings)).toBeUndefined();
		});
	});

	describe('userSettingsNetworks', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userSettingsNetworks)).toBeUndefined();
		});

		it('should return user settings network if it is not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userSettingsNetworks)).toEqual(mockNetworksSettings);
		});
	});

	describe('userAgreementsData', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userAgreementsData)).toBeUndefined();
		});

		it('should return user agreements if it is not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userAgreementsData)).toEqual(mockUserAgreements);
		});
	});
});
