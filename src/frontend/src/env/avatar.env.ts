import { parseBoolEnvVar } from '$lib/utils/env.utils';

// TODO: remove once the feature has been completed
export const AVATAR_ENABLED = parseBoolEnvVar(import.meta.env.VITE_AVATAR_ENABLED);
