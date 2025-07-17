import { parseBoolEnvVar } from '$lib/utils/env.utils';

// Enabled on Staging and Local if not set
// Todo: remove once the feature has been completed
export const EARNING_ENABLED = parseBoolEnvVar(import.meta.env.VITE_EARNING_ENABLED);
