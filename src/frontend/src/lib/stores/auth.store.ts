import {
	AUTH_MAX_TIME_TO_LIVE,
	AUTH_POPUP_HEIGHT,
	AUTH_POPUP_WIDTH,
	INTERNET_IDENTITY_CANISTER_ID,
	TEST
} from '$lib/constants/app.constants';
import type { OptionIdentity } from '$lib/types/identity';
import type { Option } from '$lib/types/utils';
import {
	createAuthClient,
	getOptionalDerivationOrigin,
	safeCreateAuthClient
} from '$lib/utils/auth.utils';
import { popupCenter } from '$lib/utils/window.utils';
import type { Identity } from '@dfinity/agent';
import type { AuthClient } from '@dfinity/auth-client';
import { nonNullish } from '@dfinity/utils';
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
	signIn: (params: AuthSignInParams) => Promise<void>;
	signOut: () => Promise<void>;
	setForTesting: (identity: Identity) => void;
}

const initAuthStore = (): AuthStore => {
	const { subscribe, set, update } = writable<AuthStoreData>({
		identity: undefined
	});

	return {
		subscribe,

		sync: async () => {
			authClient = authClient ?? (await createAuthClient());
			const isAuthenticated: boolean = await authClient.isAuthenticated();

			set({
				identity: isAuthenticated ? authClient.getIdentity() : null
			});
		},

		signIn: ({ domain }: AuthSignInParams) =>
			// eslint-disable-next-line no-async-promise-executor
			new Promise<void>(async (resolve, reject) => {
				// When the user signs out, we modify the storage, triggering a call to `sync()` method through `<svelte:window onstorage={syncAuthStore} />` in the page.
				// The `sync()` method creates a new `AuthClient` (since the previous one was nullified on sign out), causing the creation of new identity keys in IndexedDB.
				// To avoid using such keys (or tampered ones) for the next login, we use method `safeCreateAuthClient()` which clears any stored keys before creating a new `AuthClient`.
				authClient = await safeCreateAuthClient();

				const identityProvider = nonNullish(INTERNET_IDENTITY_CANISTER_ID)
					? /apple/i.test(navigator?.vendor)
						? `http://localhost:4943?canisterId=${INTERNET_IDENTITY_CANISTER_ID}`
						: `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`
					: `https://identity.${domain ?? 'internetcomputer.org'}`;

				await authClient?.login({
					maxTimeToLive: AUTH_MAX_TIME_TO_LIVE,
					onSuccess: () => {
						update((state: AuthStoreData) => ({
							...state,
							identity: authClient?.getIdentity()
						}));

						resolve();
					},
					onError: reject,
					identityProvider,
					windowOpenerFeatures: popupCenter({ width: AUTH_POPUP_WIDTH, height: AUTH_POPUP_HEIGHT }),
					...getOptionalDerivationOrigin()
				});
			}),

		signOut: async () => {
			const client: AuthClient = authClient ?? (await createAuthClient());

			await client.logout();

			// This fix a "sign in -> sign out -> sign in again" flow without window reload.
			authClient = null;

			update((state: AuthStoreData) => ({
				...state,
				identity: null
			}));
		},

		/**
		 * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
		 * ⚠️          **Warning:**       ⚠️
		 * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
		 *
		 * Sets a mock identity for testing purposes.
		 *
		 * This function allows to manually set a test identity in the `authStore`,
		 * This is a hack and should **only** be used in a testing environment.
		 *
		 * Ensure that the `TEST` flag is enabled (e.g., via `npm run test`) before using this function.
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
