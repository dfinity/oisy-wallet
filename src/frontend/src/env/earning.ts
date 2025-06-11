import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Enabled on Staging and Local if not set
export const EARNING_ENABLED =
	JSON.parse(import.meta.env.VITE_EARNING_ENABLED ?? (STAGING || LOCAL)) === true;
