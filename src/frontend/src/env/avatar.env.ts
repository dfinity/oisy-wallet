import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

// Enabled on Staging and Local
// TODO: remove once the feature has been completed
export const AVATAR_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_AVATAR_ENABLED ?? (STAGING || LOCAL)
);