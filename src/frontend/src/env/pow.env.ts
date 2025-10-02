// Enables the POW Protector on the frontend. Remember to also enable/disable the feature in the backend.
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const POW_FEATURE_ENABLED = parseBoolEnvVar(import.meta.env.VITE_POW_FEATURE_ENABLED);
