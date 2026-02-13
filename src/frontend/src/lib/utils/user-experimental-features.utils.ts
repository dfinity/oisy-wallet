import type {
	ExperimentalFeatureSettings,
	ExperimentalFeatureSettingsFor
} from '$declarations/backend/backend.did';
import type {
	ExperimentalFeatureId,
	UserExperimentalFeatures
} from '$lib/types/user-experimental-features';
import { isNullish } from '@dfinity/utils';

const featureIdToKey = (
	featureId: ExperimentalFeatureId
): ExperimentalFeatureSettingsFor | undefined => {
	switch (featureId) {
		case 'AiAssistantBeta':
			return { AiAssistantBeta: null };

		default:
			console.warn(`Unknown featureId: ${featureId}`);
	}
};

export const mapUserExperimentalFeatures = (
	userExperimentalFeatures: UserExperimentalFeatures
): Array<[ExperimentalFeatureSettingsFor, ExperimentalFeatureSettings]> =>
	Object.keys(userExperimentalFeatures).reduce<
		Array<[ExperimentalFeatureSettingsFor, ExperimentalFeatureSettings]>
	>((acc, featureId) => {
		const { enabled } = userExperimentalFeatures[featureId as ExperimentalFeatureId];

		const key: ExperimentalFeatureSettingsFor | undefined = featureIdToKey(
			featureId as ExperimentalFeatureId
		);

		if (isNullish(key)) {
			return acc;
		}

		return [...acc, [key, { enabled }]];
	}, []);
