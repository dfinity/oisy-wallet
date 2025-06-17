import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { Languages } from '$lib/types/languages';

export const SUPPORTED_LANGUAGES = Object.entries(Languages);

// Enabled on Staging and Local if not set
// Todo: remove once the feature has been completed
export const I18N_ENABLED =
	JSON.parse(import.meta.env.VITE_I18N_ENABLED ?? (STAGING || LOCAL)) === true;
