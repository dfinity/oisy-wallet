import type { Identity } from '@dfinity/agent';
import { AuthClient, IdbStorage, KEY_STORAGE_KEY } from '@dfinity/auth-client';

// We use a dedicated storage for the auth client to better manage it, e.g. clear it for a new login
// @see src/lib/utils/auth.utils.ts safeCreateAuthClient
export const authClientStorage = new IdbStorage();

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
