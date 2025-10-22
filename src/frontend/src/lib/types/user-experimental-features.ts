import type { ExperimentalFeatureSettingsFor } from '$declarations/backend/declarations/backend.did';

interface UserExperimentalFeatureSettings {
	enabled: boolean;
}

export type ExperimentalFeatureId = keyof ExperimentalFeatureSettingsFor;

export type UserExperimentalFeatures = Record<
	ExperimentalFeatureId,
	UserExperimentalFeatureSettings
>;
