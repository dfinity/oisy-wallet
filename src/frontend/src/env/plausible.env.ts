import {
	AUDIT,
	BETA,
	IS_SIGNER_DOMAIN,
	MODE,
	PROD,
	SIGNER_TARGET,
	STAGING,
	TEST_FE
} from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

const signerSubdomain = (prefix?: string): string | null => {
	const base = SIGNER_TARGET === 'legacy_signer' ? 'legacy-signer' : 'signer';

	return prefix ? `${prefix}.${base}.oisy.com` : `${base}.oisy.com`;
};

const resolveSignerDomain = (): string | null => {
	if (PROD) {
		return signerSubdomain();
	}
	if (BETA) {
		return signerSubdomain('beta');
	}
	if (STAGING) {
		return signerSubdomain('staging');
	}
	return null;
};

const resolveStandardDomain = (): string | null => {
	if (PROD) {
		return 'oisy.com';
	}

	if (BETA) {
		return 'beta.oisy.com';
	}

	if (TEST_FE) {
		return `${MODE.replace('test_', '').replace('_', '')}.oisy.com`;
	}

	if (AUDIT) {
		return 'audit.oisy.com';
	}

	if (STAGING) {
		return 'staging.oisy.com';
	}

	return null;
};

export const PLAUSIBLE_DOMAIN = IS_SIGNER_DOMAIN ? resolveSignerDomain() : resolveStandardDomain();

export const PLAUSIBLE_ENABLED = parseBoolEnvVar(import.meta.env.VITE_PLAUSIBLE_ENABLED);
