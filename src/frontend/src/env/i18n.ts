import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Enabled on Staging and Local if not set
// Todo: remove once the feature has been completed
export const I18N_ENABLED =
	JSON.parse(import.meta.env.VITE_I18N_ENABLED ?? (STAGING || LOCAL)) === true;
