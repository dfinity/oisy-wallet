import {
	aiAssistantBetaEnabled,
	userExperimentalFeatures
} from '$lib/derived/user-experimental-features.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockUserExperimentalFeatures } from '$tests/mocks/user-experimental-features.mock';
import {
	mockExperimentalFeaturesSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('user-experimental-features.derived', () => {
	const certified = true;

	describe('userExperimentalFeatures', () => {
		it('should be null when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userExperimentalFeatures)).toEqual(null);
		});

		it('should return be null when user experimental features are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						experimental_features: {
							...mockExperimentalFeaturesSettings,
							experimental_features: []
						}
					})
				}
			});

			expect(get(userExperimentalFeatures)).toEqual(null);
		});

		it('should return the user experimental features if they are set', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(userExperimentalFeatures)).toEqual({
				...mockUserExperimentalFeatures
			});
		});
	});

	describe('aiAssistantBetaEnabled', () => {
		it('should be false when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(aiAssistantBetaEnabled)).toBeFalsy();
		});

		it('should be true when AI assistant feature is set', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });

			expect(get(aiAssistantBetaEnabled)).toBeTruthy();
		});
	});
});
