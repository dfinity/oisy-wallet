import {
	MOBILE_AUTH_CALLBACK_URI,
	MOBILE_AUTH_II_TRANSPORT_URL,
	MOBILE_AUTH_MAX_TIME_TO_LIVE,
	MOBILE_AUTH_REDIRECT_CALLBACK_PATH,
	MOBILE_AUTH_SESSION_EXPIRATION_STORAGE_KEY
} from '$lib/constants/mobile-auth.constants';
import { MOBILE_APP_AUTH_TRANSPORT } from '$lib/constants/mobile-flags.constants';
import { OISY_URL } from '$lib/constants/oisy.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OpenIdProvider } from '$lib/types/auth';
import {
	buildIcrc167DelegationUrl,
	buildMobileAuthBridgeUrl,
	isIcrc167CallbackUrl,
	isMobileAuthCallbackUrl,
	parseIcrc167CallbackUrl,
	parseMobileAuthCallbackUrl
} from '$lib/utils/auth-mobile.utils';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { isNullish, nonNullish, uint8ArrayToBase64, uint8ArrayToHexString } from '@dfinity/utils';
import { KEY_STORAGE_DELEGATION, KEY_STORAGE_KEY } from '@icp-sdk/auth/client';
import { DelegationChain, Ed25519KeyIdentity, isDelegationValid } from '@icp-sdk/core/identity';
import { get } from 'svelte/store';

export type MobileSignInResult =
	{ status: 'ok' } | { status: 'error'; err?: unknown } | { status: 'superseded' };

// Resolver of the in-flight `signInMobile` promise. The deep-link callback
// settles it; a new sign-in attempt supersedes it. Deliberately NOT a timeout:
// the user may legitimately spend minutes in the system browser, and an
// unsettled promise never reports a false success. If the OS recycles the
// WebView while the user authenticates, this whole JS context — promise
// included — is gone, and the cold-start path in `initMobileAuthListener`
// completes the login independently.
let pendingSignInResolver: ((result: MobileSignInResult) => void) | undefined;

const settlePendingSignIn = (result: MobileSignInResult) => {
	pendingSignInResolver?.(result);
	pendingSignInResolver = undefined;
};

/**
 * Native (Capacitor) sign-in — POC.
 *
 * The WebView cannot run the web sign-in flow (no WebAuthn, no `window.opener`
 * channel), so the app opens the **system browser** on the auth bridge served
 * by the canonical web origin. The bridge returns a delegation chain — bound
 * to the session key generated here — via the `oisy://` deep link, and the
 * chain is persisted exactly where the auth client expects it, so the rest of
 * the app (stores, services, workers) is unchanged.
 *
 * The returned promise settles only once the deep-link callback has been
 * validated and persisted (or has failed) — callers can safely treat a
 * resolved `{ status: 'ok' }` as "authenticated now".
 *
 * See docs/ai/spec-driven-development/specs/2026-07-10-feat-mobile-app-poc.md.
 */
export const signInMobile = async ({
	openIdProvider
}: { openIdProvider?: OpenIdProvider } = {}): Promise<MobileSignInResult> => {
	// Supersede any in-flight attempt and claim the resolver slot BEFORE the
	// first await, so two rapid calls can never race for it.
	settlePendingSignIn({ status: 'superseded' });

	const result = new Promise<MobileSignInResult>((resolve) => {
		pendingSignInResolver = resolve;
	});

	const sessionKey = Ed25519KeyIdentity.generate();

	const { storage } = AuthClientProvider.getInstance();

	// Clear any prior delegation (and its cached expiration) BEFORE persisting
	// the new session key. Otherwise a cancelled or never-returning sign-in
	// would leave a fresh key paired with a stale delegation that targets a
	// different public key — the ECDSA/delegation mismatch that
	// `AuthClientProvider.safeCreateAuthClient` documents.
	await storage.remove(KEY_STORAGE_DELEGATION);
	localStorage.removeItem(MOBILE_AUTH_SESSION_EXPIRATION_STORAGE_KEY);

	// Persist the session key before leaving the app: the OS may recycle the
	// WebView while the user authenticates in the system browser, so the
	// callback handler must be able to restore the key from storage.
	await storage.set(KEY_STORAGE_KEY, JSON.stringify(sessionKey.toJSON()));

	const url =
		MOBILE_APP_AUTH_TRANSPORT === 'redirect'
			? // ICRC-167: open Internet Identity directly; the delegation returns via
				// the universal link on the canonical origin. Provider choice (passkey
				// vs Google/Apple/Microsoft) happens on II's own page, so the
				// `openIdProvider` hint is not forwarded on this transport.
				buildIcrc167DelegationUrl({
					transportUrl: MOBILE_AUTH_II_TRANSPORT_URL,
					callbackUrl: redirectCallbackUrl(),
					sessionPublicKeyDerBase64: uint8ArrayToBase64(sessionKey.getPublicKey().toDer()),
					maxTimeToLive: MOBILE_AUTH_MAX_TIME_TO_LIVE,
					state: newRedirectState()
				})
			: buildMobileAuthBridgeUrl({
					baseUrl: OISY_URL,
					sessionPublicKeyDerHex: uint8ArrayToHexString(sessionKey.getPublicKey().toDer()),
					redirectUri: MOBILE_AUTH_CALLBACK_URI,
					// One-Click sign-in (Google / Apple / Microsoft) rides through the same
					// bridge: Internet Identity 2.0 performs the OIDC flow on the web side.
					...(nonNullish(openIdProvider) ? { openIdProvider } : {})
				});

	try {
		await Browser.open({ url });
	} catch (err: unknown) {
		// The system browser never opened — no callback can ever arrive.
		pendingSignInResolver = undefined;
		throw err;
	}

	return await result;
};

const redirectCallbackUrl = (): string => `${OISY_URL}${MOBILE_AUTH_REDIRECT_CALLBACK_PATH}`;

// Anti-injection nonce for the redirect flow, echoed back by the signer in the
// callback's `state`. In-memory only: if the OS recycles the WebView while the
// user authenticates, the nonce is gone and the state check is skipped on the
// cold-start path — the chain-must-bind-to-our-session-key check below remains
// the authoritative gate in every case.
let pendingRedirectState: string | undefined;

const newRedirectState = (): string => {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	pendingRedirectState = uint8ArrayToHexString(bytes);
	return pendingRedirectState;
};

const toastCallbackError = (err?: unknown) => {
	toastsError({
		msg: { text: replaceOisyPlaceholders(get(i18n).mobile_auth.error.error_while_signing_in) },
		err
	});

	settlePendingSignIn({ status: 'error', err });
};

const handleMobileAuthCallback = async ({ url }: { url: string }): Promise<void> => {
	// ICRC-167 universal-link callback (redirect transport).
	if (isIcrc167CallbackUrl({ url, callbackUrl: redirectCallbackUrl() })) {
		try {
			// Throws when the signer returned a JSON-RPC error (e.g. user denied).
			const parsed = parseIcrc167CallbackUrl(url);

			if (isNullish(parsed)) {
				toastCallbackError();
				return;
			}

			const { chain, state } = parsed;

			// The state check only applies while this JS context still holds the
			// nonce — after a WebView recycle it is gone and the binding check in
			// `completeSignIn` is the authoritative gate.
			if (nonNullish(pendingRedirectState) && state !== pendingRedirectState) {
				toastCallbackError();
				return;
			}
			pendingRedirectState = undefined;

			await completeSignIn(chain);
		} catch (err: unknown) {
			toastCallbackError(err);
		}
		return;
	}

	// Phase-1 bridge callback (`oisy://` custom scheme).
	if (!isMobileAuthCallbackUrl(url)) {
		return;
	}

	try {
		const delegationChainJson = parseMobileAuthCallbackUrl(url);

		if (nonNullish(delegationChainJson)) {
			const chain = DelegationChain.fromJSON(delegationChainJson);

			await completeSignIn(chain);
			return;
		}

		// The /signer-callback web fallback relays an ICRC-167 fragment over the
		// custom scheme when the universal link did not reach the app.
		const parsed = parseIcrc167CallbackUrl(url);

		if (isNullish(parsed)) {
			toastCallbackError();
			return;
		}

		await completeSignIn(parsed.chain);
	} catch (err: unknown) {
		toastCallbackError(err);
	}
};

/**
 * Shared tail of both transports: validates the chain, binds it to the stored
 * session key, persists it where the auth client expects it and syncs the
 * auth store. Settles the pending sign-in promise.
 */
const completeSignIn = async (chain: DelegationChain): Promise<void> => {
	try {
		if (!isDelegationValid(chain)) {
			toastCallbackError();
			return;
		}

		const { storage } = AuthClientProvider.getInstance();

		const storedKey = await storage.get(KEY_STORAGE_KEY);

		if (typeof storedKey !== 'string') {
			toastCallbackError();
			return;
		}

		// The chain must delegate to OUR session key: a chain bound to any other
		// key is useless at best and an injection attempt at worst.
		const sessionKey = Ed25519KeyIdentity.fromJSON(storedKey);
		const sessionPublicKeyDerHex = uint8ArrayToHexString(sessionKey.getPublicKey().toDer());
		const lastDelegation = chain.delegations.at(-1);

		// A chain with no delegations can't be bound to our key — reject rather
		// than dereference `undefined`.
		if (isNullish(lastDelegation)) {
			toastCallbackError();
			return;
		}

		const delegatedToHex = uint8ArrayToHexString(lastDelegation.delegation.pubkey);

		if (delegatedToHex !== sessionPublicKeyDerHex) {
			toastCallbackError();
			return;
		}

		await storage.set(KEY_STORAGE_DELEGATION, JSON.stringify(chain.toJSON()));

		// Replicate the auth client's synchronous expiration cache (it is only
		// written by `AuthClient.signIn`, which we bypass on native).
		const earliestExpiration = chain.delegations.reduce<bigint | undefined>(
			(min, { delegation: { expiration } }) =>
				isNullish(min) || expiration < min ? expiration : min,
			undefined
		);
		if (nonNullish(earliestExpiration)) {
			localStorage.setItem(
				MOBILE_AUTH_SESSION_EXPIRATION_STORAGE_KEY,
				earliestExpiration.toString()
			);
		}

		// Closes the in-app browser view on iOS; no-op on Android where the deep
		// link already brought the app back to the foreground.
		try {
			await Browser.close();
		} catch (_err: unknown) {
			// Browser.close is unsupported on some platforms — never fail the login for it.
		}

		// The provider's cached client captured its (anonymous) state before the
		// delegation existed — rebuild it so it restores key + delegation from
		// storage, then sync the store through the regular path.
		await AuthClientProvider.getInstance().createAuthClient({ forceRecreate: true });
		await authStore.forceSync();

		settlePendingSignIn({ status: 'ok' });
	} catch (err: unknown) {
		toastCallbackError(err);
	}
};

let mobileAuthListenerRegistered = false;

/**
 * Registers the deep-link listener for the auth-bridge callback. Called at
 * app boot on native platforms — covers both the warm case (app alive in
 * background) and the cold start (app launched by the link). Idempotent: a
 * second call (HMR, accidental double-init) is a no-op, so a callback can
 * never be processed twice.
 */
export const initMobileAuthListener = async (): Promise<void> => {
	if (mobileAuthListenerRegistered) {
		return;
	}
	mobileAuthListenerRegistered = true;

	await App.addListener('appUrlOpen', ({ url }) => {
		void handleMobileAuthCallback({ url });
	});

	const launchUrl = await App.getLaunchUrl();
	if (nonNullish(launchUrl)) {
		await handleMobileAuthCallback(launchUrl);
	}
};
