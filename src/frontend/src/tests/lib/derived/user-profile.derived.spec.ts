import {
	hideMicroTransactions,
	userAgreementsData,
	userDismissedNotifications,
	userExperimentalFeaturesSettings,
	userNotificationSettings,
	userProfile,
	userProfileLoaded,
	userProfileVersion,
	userSettings,
	userSettingsNetworks,
	userTransactionFilterSettings
} from '$lib/derived/user-profile.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import {
	mockExperimentalFeaturesSettings,
	mockNetworksSettings,
	mockUserAgreements,
	mockUserProfile,
	mockUserProfileVersion,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
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

		it('should return user settings networks if it is not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userSettingsNetworks)).toEqual(mockNetworksSettings);
		});
	});

	describe('userExperimentalFeaturesSettings', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userExperimentalFeaturesSettings)).toBeUndefined();
		});

		it('should return user settings networks if it is not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userExperimentalFeaturesSettings)).toEqual(mockExperimentalFeaturesSettings);
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

	describe('userNotificationSettings', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userNotificationSettings)).toBeUndefined();
		});

		it('should return undefined when settings have no notifications', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userNotificationSettings)).toBeUndefined();
		});

		it('should return notification settings if they are set', () => {
			const mockNotificationSettings = {
				dismissed_notifications: [
					{ Simple: { kind: { BtcActivityInfo: null }, version: 1 } },
					{ Qualified: { kind: { NoIndexCanister: null }, qualifier: 'ETH', version: 1 } }
				]
			};

			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						notifications: toNullable(mockNotificationSettings)
					})
				}
			});

			expect(get(userNotificationSettings)).toEqual(mockNotificationSettings);
		});
	});

	describe('userDismissedNotifications', () => {
		it('should return empty array when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userDismissedNotifications)).toEqual([]);
		});

		it('should return empty array when settings have no notifications', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userDismissedNotifications)).toEqual([]);
		});

		it('should return dismissed notifications when set', () => {
			const dismissed = [
				{ Simple: { kind: { BtcActivityInfo: null }, version: 1 } },
				{ Qualified: { kind: { NoIndexCanister: null }, qualifier: 'ETH', version: 1 } }
			];

			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						notifications: toNullable({
							dismissed_notifications: dismissed
						})
					})
				}
			});

			expect(get(userDismissedNotifications)).toEqual(dismissed);
		});
	});

	describe('userTransactionFilterSettings', () => {
		it('should default to hide_micro_transactions true when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userTransactionFilterSettings)).toEqual({ hide_micro_transactions: true });
		});

		it('should default to hide_micro_transactions true when transactions is not set', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						transactions: []
					})
				}
			});

			expect(get(userTransactionFilterSettings)).toEqual({ hide_micro_transactions: true });
		});

		it('should default to hide_micro_transactions true when filter is not set', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						transactions: [{ filter: [] }]
					})
				}
			});

			expect(get(userTransactionFilterSettings)).toEqual({ hide_micro_transactions: true });
		});

		it('should return filter settings when set', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						transactions: [{ filter: [{ hide_micro_transactions: false }] }]
					})
				}
			});

			expect(get(userTransactionFilterSettings)).toEqual({ hide_micro_transactions: false });
		});
	});

	describe('hideMicroTransactions', () => {
		it('should default to true when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(hideMicroTransactions)).toBe(true);
		});

		it('should return false when filter disables it', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						transactions: [{ filter: [{ hide_micro_transactions: false }] }]
					})
				}
			});

			expect(get(hideMicroTransactions)).toBe(false);
		});

		it('should return true when filter enables it', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						transactions: [{ filter: [{ hide_micro_transactions: true }] }]
					})
				}
			});

			expect(get(hideMicroTransactions)).toBe(true);
		});
	});
});
