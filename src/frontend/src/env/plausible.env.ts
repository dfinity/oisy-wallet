import { AUDIT, BETA, MODE, PROD, STAGING, TEST_FE } from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const PLAUSIBLE_DOMAIN = PROD
	? 'oisy.com'
	: BETA
		? 'beta.oisy.com'
		: TEST_FE
			? `${MODE.replace('test_', '').replace('_', '')}.oisy.com`
			: AUDIT
				? 'audit.oisy.com'
				: STAGING
					? 'staging.oisy.com'
					: null;

export const PLAUSIBLE_ENABLED = parseBoolEnvVar(import.meta.env.VITE_PLAUSIBLE_ENABLED);
