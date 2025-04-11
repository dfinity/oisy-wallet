import { PROD } from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const PLAUSIBLE_DOMAIN = PROD ? 'oisy.com' : 'staging.oisy.com';

export const PLAUSIBLE_ENABLED = parseBoolEnvVar(import.meta.env.VITE_PLAUSIBLE_ENABLED);
