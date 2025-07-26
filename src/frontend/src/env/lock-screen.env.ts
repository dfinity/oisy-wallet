import { parseBoolEnvVar } from '$lib/utils/env.utils';

// TODO: remove once the feature has been completed
export const LOCK_SCREEN_ENABLED = parseBoolEnvVar(import.meta.env.VITE_LOCK_SCREEN_ENABLED);
