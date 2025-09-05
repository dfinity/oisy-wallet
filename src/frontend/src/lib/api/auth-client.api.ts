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
