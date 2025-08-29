import { authClientStorage } from '$lib/api/auth-client.api';
import { AUTH_ALTERNATIVE_ORIGINS, AUTH_DERIVATION_ORIGIN } from '$lib/constants/app.constants';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import type { Identity } from '@dfinity/agent';
import { AuthClient, KEY_STORAGE_KEY } from '@dfinity/auth-client';
import { notEmptyString } from '@dfinity/utils';

export const createAuthClient = (): Promise<AuthClient> =>
	AuthClient.create({
		storage: authClientStorage,
		idleOptions: {
			disableIdle: true,
			disableDefaultIdleCallback: true
		}
	});

/**
 * Since icp-js-core persists identity keys in IndexedDB by default,
 * they could be tampered with and affect the next login.
 * To ensure each session starts clean and safe, we clear the stored keys before creating a new AuthClient.
 */
export const safeCreateAuthClient = async (): Promise<AuthClient> => {
	await authClientStorage.remove(KEY_STORAGE_KEY);
	return await createAuthClient();
};

/**
 * In certain features, we want to execute jobs with the authenticated identity without getting it from the auth.store.
 * This is notably useful for Web Workers who do not have access to the window.
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
