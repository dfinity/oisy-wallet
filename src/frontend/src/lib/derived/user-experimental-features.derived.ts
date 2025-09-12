import type { ExperimentalFeatureSettingsFor } from '$declarations/backend/backend.did';
import { userExperimentalFeaturesSettings } from '$lib/derived/user-profile.derived';
import type {
	ExperimentalFeatureId,
	UserExperimentalFeatures
} from '$lib/types/user-experimental-features';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userExperimentalFeatures: Readable<UserExperimentalFeatures | null> = derived(
	[userExperimentalFeaturesSettings],
	([$userExperimentalFeaturesSettings]) => {
		const userExperimentalFeatures = $userExperimentalFeaturesSettings?.experimental_features;

		if (isNullish(userExperimentalFeatures) || userExperimentalFeatures.length === 0) {
			// No enabled experimental features
			return null;
		}

		const keyToFeatureId = (key: ExperimentalFeatureSettingsFor): ExperimentalFeatureId => {
			if ('AiAssistantBeta' in key) {
				return 'AiAssistantBeta';
			}

			// Force compiler error on unhandled cases based on leftover types
			const _: never = key;

			throw new Error(`Unknown feature key: ${key}`);
		};

		return {
			...userExperimentalFeatures.reduce<UserExperimentalFeatures>((acc, [key, { enabled }]) => {
				const featureId: ExperimentalFeatureId = keyToFeatureId(key);
				return { ...acc, [featureId]: { enabled } };
			}, {} as UserExperimentalFeatures)
		};
	}
);

export const aiAssistantBetaEnabled: Readable<boolean> = derived(
	[userExperimentalFeatures],
	([$userExperimentalFeatures]) => $userExperimentalFeatures?.AiAssistantBeta?.enabled ?? false
);
