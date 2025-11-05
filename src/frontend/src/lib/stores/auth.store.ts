import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { AuthClientNotInitializedError } from '$lib/types/errors';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';

import {
	AUTH_MAX_TIME_TO_LIVE,
	AUTH_POPUP_HEIGHT,
	AUTH_POPUP_WIDTH,
	INTERNET_IDENTITY_CANISTER_ID,
	TEST
} from '$lib/constants/app.constants';
import { AuthBroadcastChannel } from '$lib/providers/auth-broadcast.providers';
import type { OptionIdentity } from '$lib/types/identity';
import type { Option } from '$lib/types/utils';
import { getOptionalDerivationOrigin } from '$lib/utils/auth.utils';
import { popupCenter } from '$lib/utils/window.utils';
import type { Identity } from '@dfinity/agent';
import { KEY_STORAGE_KEY, type AuthClient } from '@dfinity/auth-client';
import type { ECDSAKeyIdentity } from '@dfinity/identity';
import { writable, type Readable } from 'svelte/store';

export interface AuthStoreData {
	identity: OptionIdentity;
}

let authClient: Option<AuthClient>;

export interface AuthSignInParams {
	domain?: 'ic0.app' | 'internetcomputer.org';
}

export interface AuthStore extends Readable<AuthStoreData> {
	sync: () => Promise<void>;
	forceSync: () => Promise<void>;
	signIn: (params: AuthSignInParams) => Promise<void>;
	signOut: () => Promise<void>;
	setForTesting: (identity: Identity) => void;
}

const initAuthStore = (): AuthStore => {
	const { subscribe, set } = writable<AuthStoreData>({
		identity: undefined
	});

	// With different tabs opened of OISY in the same browser, it may happen that separate authClient objects are out-of-sync among themselves.
	// To avoid issues, we use this method to pick the most up-to-date authClient object, since the data are cached in IndexedDB.
	const pickAuthClient = async (): Promise<AuthClient> => {
		if (nonNullish(authClient) && (await authClient.isAuthenticated())) {
			return authClient;
		}

		const { createAuthClient, safeCreateAuthClient } = AuthClientProvider.getInstance();

		const refreshed = await createAuthClient();

		if (await refreshed.isAuthenticated()) {
			return refreshed;
		}

		// When the user signs out, we trigger a call to `sync()`.
		// The `sync()` method creates a new `AuthClient` (since the previous one was nullified on sign-out), causing the creation of new identity keys in IndexedDB.
		// To avoid using such keys (or tampered ones) for the next login, we use the method `safeCreateAuthClient()` which clears any stored keys before creating a new `AuthClient`.
		// We do it only if the user is not authenticated, because if it is, then it is theoretically already safe (or at least, it is out of our control to make it safer).
		return await safeCreateAuthClient();
	};

	/**
	 * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
	 * ⚠️          **Warning:**       ⚠️
	 * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
	 *
	 * When multiple OISY tabs are open in the same browser, each creates a new `authClient`
	 * object with its own key pair. Since keys are stored in IndexedDB (IDB) as a security
	 * measure to avoid key injection, the last loaded tab overwrites the cached keys.
	 *
	 * This causes a problem: if a user logs in on a tab that is not the "latest" one
	 * (without refreshing first), the existing `authClient` in that tab uses a key pair
	 * different from the one currently cached in IDB. It will then request a delegation for
	 * those non-cached keys, and store that delegation in IDB too. As a result, the cache
	 * ends up with a delegation that does not match the cached key.
	 *
	 * Later, if we recreate the `authClient` (e.g. inside a worker) or refresh another tab,
	 * the mismatch between keys and delegation leads to invalid signatures and errors.
	 *
	 * To prevent this, we must ensure that after login, the correct key is always cached in
	 * IDB, overwriting any previously stored key. This guarantees that delegation and keys
	 * remain in sync.
	 *
	 * TODO: Remove this when `authClient` will handle it by itself during login.
	 */
	const overwriteStoredIdentityKey = async () => {
		try {
			assertNonNullish(authClient);

			const key = authClient['_key'];

			await AuthClientProvider.getInstance().storage.set(
				KEY_STORAGE_KEY,
				(key as ECDSAKeyIdentity).getKeyPair()
			);
		} catch (_: unknown) {
			// In the unlikely event of an error while setting a value in IndexedDB,
			// we log out the user and refresh the page to prevent potential conflicts.

			await authStore.signOut();

			window.location.reload();
		}
	};

	const sync = async ({ forceSync }: { forceSync: boolean }) => {
		authClient = forceSync
			? await AuthClientProvider.getInstance().createAuthClient()
			: await pickAuthClient();

		const isAuthenticated: boolean = await authClient.isAuthenticated();

		set({ identity: isAuthenticated ? authClient.getIdentity() : null });
	};

	return {
		subscribe,

		sync: async () => {
			await sync({ forceSync: false });
		},

		forceSync: async () => {
			await sync({ forceSync: true });
		},

		signIn: ({ domain }: AuthSignInParams) =>
			// eslint-disable-next-line no-async-promise-executor
			new Promise<void>(async (resolve, reject) => {
				// When signing in, we require the authClient to be safely defined through the sync method (called when the window loads).
				// We are not able to recreate authClient safely here since there are some browsers (like Safari) that block popups if there is an additional async call in this call stack.
				if (isNullish(authClient)) {
					reject(new AuthClientNotInitializedError());

					return;
				}

				const identityProvider = nonNullish(INTERNET_IDENTITY_CANISTER_ID)
					? /apple/i.test(navigator?.vendor)
						? `http://localhost:4943?canisterId=${INTERNET_IDENTITY_CANISTER_ID}`
						: `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`
					: `https://identity.${domain ?? 'internetcomputer.org'}`;

				await authClient.login({
					maxTimeToLive: AUTH_MAX_TIME_TO_LIVE,
					onSuccess: async () => {
						await overwriteStoredIdentityKey();

						set({ identity: authClient?.getIdentity() });

						try {
							// If the user has more than one tab open in the same browser,
							// there could be a mismatch of the cached delegation chain vs the identity key of the `authClient` object.
							// This causes the `authClient` to be unable to correctly sign calls, raising Trust Errors.
							// To mitigate this, we use a BroadcastChannel to notify other tabs when a login has occurred, so that they can sync their `authClient` object.
							const bc = new AuthBroadcastChannel();
							bc.postLoginSuccess();
						} catch (err: unknown) {
							// We don't really care if the broadcast channel fails to open or if it fails to post messages.
							// This is a non-critical feature that improves the UX when OISY is open in multiple tabs.
							// We just print a warning in the console for debugging purposes.
							console.warn('Auth BroadcastChannel posting failed', err);
						}

						resolve();
					},
					onError: reject,
					identityProvider,
					windowOpenerFeatures: popupCenter({ width: AUTH_POPUP_WIDTH, height: AUTH_POPUP_HEIGHT }),
					...getOptionalDerivationOrigin()
				});
			}),

		signOut: async () => {
			const client: AuthClient =
				authClient ?? (await AuthClientProvider.getInstance().createAuthClient());

			await client.logout();

			// This fixes a "sign in -> sign-out -> sign in again" flow without reloading the window.
			authClient = null;

			set({ identity: null });
		},

		/**
		 * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
		 * ⚠️          **Warning:**       ⚠️
		 * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
		 *
		 * Sets a mock identity for testing purposes.
		 *
		 * This function allows manually setting a test identity in the `authStore`,
		 * This is a hack and should **only** be used in a testing environment.
		 *
		 * Ensure that the `TEST` flag is enabled (e.g. via `npm run test`) before using this function.
		 * If invoked outside the testing environment, it will throw an error.
		 *
		 * @param {Identity} identity - The mock identity object to be set for testing.
		 * @throws {Error} Throws an error if the function is called outside the test environment.
		 */
		setForTesting: (identity: Identity) => {
			if (!TEST) {
				throw new Error('This function should only be used in npm run test environment');
			}

			set({ identity });
		}
	};
};

export const authStore = initAuthStore();

export const authRemainingTimeStore = writable<number | undefined>(undefined);
