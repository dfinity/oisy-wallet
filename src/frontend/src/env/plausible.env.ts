import { BETA, PROD, STAGING, TEST_FE } from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const PLAUSIBLE_DOMAIN = PROD
	? 'oisy.com'
	: BETA
		? 'beta.oisy.com'
		: TEST_FE // Currently using 'fe1.oisy.com' for TEST_FE env, but can be adjusted to 'fe#.oisy.com' if needed.
			? 'fe1.oisy.com'
			: STAGING
				? 'staging.oisy.com'
				: null;

export const PLAUSIBLE_ENABLED = parseBoolEnvVar(import.meta.env.VITE_PLAUSIBLE_ENABLED);
