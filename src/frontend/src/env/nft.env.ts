import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Enabled on Staging and Local if not set
// TODO: remove once the feature has been completed
export const NFTS_ENABLED =
	JSON.parse(import.meta.env.VITE_NFTS_ENABLED ?? (STAGING || LOCAL)) === true;