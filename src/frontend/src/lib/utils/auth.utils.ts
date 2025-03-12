import { AUTH_ALTERNATIVE_ORIGINS, AUTH_DERIVATION_ORIGIN } from '$lib/constants/app.constants';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import type { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { notEmptyString } from '@dfinity/utils';

export const createAuthClient = (): Promise<AuthClient> =>
	AuthClient.create({
		idleOptions: {
			disableIdle: true,
			disableDefaultIdleCallback: true
		}
	});

/**
 * In certain features, we want to execute jobs with the authenticated identity without getting it from the auth.store.
 * This is notably useful for Web Workers which do not have access to the window.
 */
export const loadIdentity = async (): Promise<Identity | undefined> => {
	const authClient = await createAuthClient();
	const authenticated = await authClient.isAuthenticated();

	// Not authenticated therefore we provide no identity as a result
	if (!authenticated) {
		return undefined;
	}

	return authClient.getIdentity();
};

const isAlternativeOrigin = (): boolean => {
	const {
		location: { origin }
	} = window;

	const knownAlternativeOrigins = (AUTH_ALTERNATIVE_ORIGINS ?? '')
		.split(',')
		.filter(notEmptyString);
	return knownAlternativeOrigins.includes(origin);
};

export const getOptionalDerivationOrigin = ():
	| { derivationOrigin: string }
	| Record<string, never> =>
	isAlternativeOrigin() && !isNullishOrEmpty(AUTH_DERIVATION_ORIGIN)
		? {
				derivationOrigin: AUTH_DERIVATION_ORIGIN
			}
		: {};
