import { PROD } from '$lib/constants/app.constants';

export const PLAUSIBLE_DOMAIN = PROD ? 'oisy.com' : 'staging.oisy.com';

export const PLAUSIBLE_ENABLED = import.meta.env.VITE_PLAUSIBLE_ENABLED === 'true';
