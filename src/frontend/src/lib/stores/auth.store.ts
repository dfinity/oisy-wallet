import {
	AUTH_MAX_TIME_TO_LIVE,
	AUTH_POPUP_HEIGHT,
	AUTH_POPUP_WIDTH,
	INTERNET_IDENTITY_CANISTER_ID,
	TEST
} from '$lib/constants/app.constants';
import { AuthBroadcastChannel } from '$lib/providers/auth-broadcast.providers';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { InternetIdentityDomain, type OpenIdProvider } from '$lib/types/auth';
import { AuthClientNotInitializedError } from '$lib/types/errors';
import type { NullishIdentity } from '$lib/types/identity';
import { getOptionalDerivationOrigin } from '$lib/utils/auth.utils';
import { consoleWarn } from '$lib/utils/console.utils';
import { popupCenter } from '$lib/utils/window.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import type { AuthClient } from '@icp-sdk/auth/client';
import type { Identity } from '@icp-sdk/core/agent';
import { writable, type Readable } from 'svelte/store';

export interface AuthStoreData {
	identity: NullishIdentity;
}

let authClient: Nullish<AuthClient>;

// Polling rate (ms) for the signer window's `closed` flag while the user is
// signing in through One-Click OpenID / Internet Identity. Kept short so the
// landing page exits its busy state promptly when the user closes the popup
// or tab without completing authentication.
const SIGNER_WINDOW_CLOSED_POLLING_RATE = 500;

// `PostMessageTransport` (used internally by `@icp-sdk/auth` v6) opens its
// signer popup with this fixed window name, derived from the identity
// provider's origin. By pre-opening a window with the same name, the
// browser's named-targeting semantics make the SDK's subsequent
// `window.open(url, sameName, features)` call reuse our window — giving us
// a reference to the popup without intercepting any global API.
const buildSignerWindowName = (identityProvider: string): string =>
	`${new URL(identityProvider).origin}-signer-window`;

// TODO: remove `signInWithUserInterruptDetection` once `@icp-sdk/auth`
// (Internet Identity SDK) ships native "user closed the popup" detection.
//
// `@dfinity/auth-client` v4 polled `idpWindow.closed` internally and called
// `onError('UserInterrupt')` when the user dismissed the popup. The v6
// rewrite swapped that mechanism for the generic ICRC-29
// `PostMessageTransport` heartbeat, which only detects a missing signer via
// ping/pong timeouts (`disconnectTimeout: 2000ms`, `pendingTimeout:
// 300000ms`). When id.ai reports `"pending"` — e.g. while redirecting to
// Google for One-Click sign-in — right before the user closes the tab, our
// sign-in promise can stay pending for up to 5 minutes, leaving the UI
// stuck on the busy spinner.
//
// The II team has acknowledged the gap but it isn't on their short-term
// roadmap, so we polyfill the behaviour here. When the SDK exposes a
// first-class signal (e.g. a dedicated user-cancelled rejection, or a
// `PostMessageTransport` option), this helper can be deleted and
// `client.signIn(...)` called directly — the existing catch in
// `auth.services.signIn` already maps `'UserInterrupt'` to a `cancelled`
// outcome.
//
// Known limitation: some PWA / standalone-mode contexts (notably iOS "Add
// to Home Screen") return a popup reference whose `.closed` flag never
// updates. The poll then silently falls back to the SDK's heartbeat
// behaviour; the Cancel button on the busy overlay (`busy.show()` sets
// `close: true`) remains the user's escape hatch there.
const signInWithUserInterruptDetection = async ({
	client,
	identityProvider,
	windowOpenerFeatures
}: {
	client: AuthClient;
	identityProvider: string;
	windowOpenerFeatures?: string;
}): Promise<Identity> => {
	// Pre-open the popup synchronously, inside the same user-gesture call
	// stack the SDK relies on, so popup blockers don't kick in. The SDK will
	// then reuse this window via the matching name.
	const signerWindow = globalThis.window.open(
		'',
		buildSignerWindowName(identityProvider),
		windowOpenerFeatures
	);

	let pollHandle: ReturnType<typeof setInterval> | undefined;

	const userInterruptPromise = new Promise<never>((_, reject) => {
		// If `window.open` returned `null` (popup blocked, sandbox, etc.) the
		// SDK's own `window.open` call will fail too and reject with a
		// transport error — we just opt out of the poll in that case.
		if (isNullish(signerWindow)) {
			return;
		}

		pollHandle = setInterval(() => {
			if (signerWindow.closed) {
				reject('UserInterrupt');
			}
		}, SIGNER_WINDOW_CLOSED_POLLING_RATE);
	});

	const signInPromise = client.signIn({
		maxTimeToLive: AUTH_MAX_TIME_TO_LIVE
	});

	// Once the user-interrupt poll wins the race, the SDK promise only
	// settles much later via its heartbeat disconnect. Silence that rejection
	// so the runtime doesn't flag it as unhandled.
	signInPromise.catch(() => undefined);

	try {
		return await Promise.race([signInPromise, userInterruptPromise]);
	} finally {
		if (nonNullish(pollHandle)) {
			clearInterval(pollHandle);
		}
	}
};

export interface AuthSignInParams {
	domain?: InternetIdentityDomain;
	asPopup?: boolean;
	/**
	 * When provided, sign-in goes through Internet Identity 2.0 using the
	 * matching OpenID Connect provider (One-Click sign-in with Google, Apple
	 * or Microsoft). Leaving it undefined falls back to the standard II
	 * passkey / device authentication flow.
	 */
	openIdProvider?: OpenIdProvider;
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
		if (nonNullish(authClient) && authClient.isAuthenticated()) {
			return authClient;
		}

		const { createAuthClient, safeCreateAuthClient } = AuthClientProvider.getInstance();

		const refreshed = await createAuthClient();

		if (refreshed.isAuthenticated()) {
			return refreshed;
		}

		// When the user signs out, we trigger a call to `sync()`.
		// The `sync()` method creates a new `AuthClient` (since the previous one was nullified on sign-out), causing the creation of new identity keys in IndexedDB.
		// To avoid using such keys (or tampered ones) for the next login, we use the method `safeCreateAuthClient()` which clears any stored keys before creating a new `AuthClient`.
		// We do it only if the user is not authenticated, because if it is, then it is theoretically already safe (or at least, it is out of our control to make it safer).
		return await safeCreateAuthClient();
	};

	const sync = async ({ forceSync }: { forceSync: boolean }) => {
		authClient = forceSync
			? await AuthClientProvider.getInstance().createAuthClient()
			: await pickAuthClient();

		const isAuthenticated: boolean = authClient.isAuthenticated();

		set({ identity: isAuthenticated ? await authClient.getIdentity() : null });
	};

	return {
		subscribe,

		sync: async () => {
			await sync({ forceSync: false });
		},

		forceSync: async () => {
			await sync({ forceSync: true });
		},

		signIn: async ({ domain, asPopup, openIdProvider }: AuthSignInParams) => {
			// When signing in, we require the authClient to be safely defined through the sync method (called when the window loads).
			// We are not able to recreate authClient safely here since there are some browsers (like Safari) that block popups if there is an additional async call in this call stack.
			if (isNullish(authClient)) {
				throw new AuthClientNotInitializedError();
			}

			// One-Click OpenID sign-in is only supported by Internet Identity 2.0
			// on mainnet (id.ai); the local II replica does not handle the
			// `?openid=…` query param, so we always force id.ai for this flow.
			const effectiveDomain =
				nonNullish(openIdProvider) && isNullish(INTERNET_IDENTITY_CANISTER_ID)
					? InternetIdentityDomain.VERSION_2_0
					: domain;

			// `@icp-sdk/auth` v6 relies on ICRC-29 `PostMessageTransport` (heartbeat
			// + JSON-RPC), which Internet Identity serves from `/authorize`. The
			// root `/` on `id.ai` returns the marketing landing page, and the
			// local II canister (since the routing refactor in #3387) only mounts
			// the ICRC-29 handler on the `(new-styling)/authorize` route; without
			// `/authorize` the heartbeat handshake silently times out, which is
			// why sign-in appeared to do nothing after the v4 → v6 migration.
			const identityProvider =
				nonNullish(INTERNET_IDENTITY_CANISTER_ID) && isNullish(openIdProvider)
					? /apple/i.test(navigator?.vendor)
						? `http://localhost:4943/authorize?canisterId=${INTERNET_IDENTITY_CANISTER_ID}`
						: `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943/authorize`
					: `https://${effectiveDomain ?? InternetIdentityDomain.VERSION_1_0}/authorize${effectiveDomain === InternetIdentityDomain.VERSION_2_0 ? '?feature_flag_min_guided_upgrade=true' : ''}`;

			const windowOpenerFeatures = asPopup
				? popupCenter({
						width: AUTH_POPUP_WIDTH,
						height: AUTH_POPUP_HEIGHT
					})
				: undefined;

			// In `@icp-sdk/auth` v6, `identityProvider`, `windowOpenerFeatures`,
			// `derivationOrigin` and `openIdProvider` are constructor-bound rather
			// than `login()` params, so we build a dedicated client for this
			// sign-in. Construction is synchronous, so the user-gesture stack is
			// preserved up to the `signIn()` call that opens the popup.
			const client = AuthClientProvider.getInstance().createAuthClientForSignIn({
				identityProvider,
				...(nonNullish(windowOpenerFeatures) ? { windowOpenerFeatures } : {}),
				...(nonNullish(openIdProvider) ? { openIdProvider } : {}),
				...getOptionalDerivationOrigin()
			});

			authClient = client;

			const identity = await signInWithUserInterruptDetection({
				client,
				identityProvider,
				windowOpenerFeatures
			});

			set({ identity });

			try {
				// If the user has more than one tab open in the same browser,
				// there could be a mismatch of the cached delegation chain vs the identity key of the `authClient` object.
				// This causes the `authClient` to be unable to correctly sign calls, raising Trust Errors.
				// To mitigate this, we use a BroadcastChannel to notify other tabs when a login has occurred, so that they can sync their `authClient` object.
				const bc = AuthBroadcastChannel.getInstance();
				bc.postLoginSuccess();
			} catch (err: unknown) {
				// We don't really care if the broadcast channel fails to open or if it fails to post messages.
				// This is a non-critical feature that improves the UX when OISY is open in multiple tabs.
				// We just print a warning in the console for debugging purposes.
				consoleWarn('Auth BroadcastChannel posting failed', err);
			}
		},

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

export const authLoggedInAnotherTabStore = writable<boolean>(false);
