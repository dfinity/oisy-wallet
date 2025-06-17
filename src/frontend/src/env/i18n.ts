import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

// Enabled on Staging and Local if not set
// Todo: remove once the feature has been completed
export const I18N_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_I18N_ENABLED ?? (STAGING || LOCAL)
);
