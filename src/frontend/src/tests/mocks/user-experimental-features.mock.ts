import type {
	ExperimentalFeatureSettings,
	ExperimentalFeatureSettingsFor
} from '$declarations/backend/backend.did';
import type { UserExperimentalFeatures } from '$lib/types/user-experimental-features';

export const mockUserExperimentalFeatures: UserExperimentalFeatures = {
	AiAssistantBeta: { enabled: true }
};

export const mockUserExperimentalFeaturesMap: Array<
	[ExperimentalFeatureSettingsFor, ExperimentalFeatureSettings]
> = [[{ AiAssistantBeta: null }, { enabled: true }]];
