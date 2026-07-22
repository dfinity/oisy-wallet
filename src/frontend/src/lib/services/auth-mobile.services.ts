import {
	MOBILE_AUTH_CALLBACK_URI,
	MOBILE_AUTH_SESSION_EXPIRATION_STORAGE_KEY
} from '$lib/constants/mobile-auth.constants';
import { OISY_URL } from '$lib/constants/oisy.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OpenIdProvider } from '$lib/types/auth';
import {
	buildMobileAuthBridgeUrl,
	isMobileAuthCallbackUrl,
	parseMobileAuthCallbackUrl
} from '$lib/utils/auth-mobile.utils';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { isNullish, nonNullish, uint8ArrayToHexString } from '@dfinity/utils';
import { KEY_STORAGE_DELEGATION, KEY_STORAGE_KEY } from '@icp-sdk/auth/client';
import { DelegationChain, Ed25519KeyIdentity, isDelegationValid } from '@icp-sdk/core/identity';
import { get } from 'svelte/store';

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
 * See docs/ai/spec-driven-development/specs/2026-07-10-feat-mobile-app-poc.md.
 */
export const signInMobile = async ({
	openIdProvider
}: { openIdProvider?: OpenIdProvider } = {}): Promise<void> => {
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

	const url = buildMobileAuthBridgeUrl({
		baseUrl: OISY_URL,
		sessionPublicKeyDerHex: uint8ArrayToHexString(sessionKey.getPublicKey().toDer()),
		redirectUri: MOBILE_AUTH_CALLBACK_URI,
		// One-Click sign-in (Google / Apple / Microsoft) rides through the same
		// bridge: Internet Identity 2.0 performs the OIDC flow on the web side.
		...(nonNullish(openIdProvider) ? { openIdProvider } : {})
	});

	await Browser.open({ url });
};

const toastCallbackError = (err?: unknown) => {
	toastsError({
		msg: { text: replaceOisyPlaceholders(get(i18n).mobile_auth.error.error_while_signing_in) },
		err
	});
};

const handleMobileAuthCallback = async ({ url }: { url: string }): Promise<void> => {
	if (!isMobileAuthCallbackUrl(url)) {
		return;
	}

	const delegationChainJson = parseMobileAuthCallbackUrl(url);

	if (isNullish(delegationChainJson)) {
		toastCallbackError();
		return;
	}

	try {
		const chain = DelegationChain.fromJSON(delegationChainJson);

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
	} catch (err: unknown) {
		toastCallbackError(err);
	}
};

/**
 * Registers the deep-link listener for the auth-bridge callback. Must be
 * called once at app boot on native platforms — covers both the warm case
 * (app alive in background) and the cold start (app launched by the link).
 */
export const initMobileAuthListener = async (): Promise<void> => {
	await App.addListener('appUrlOpen', ({ url }) => {
		void handleMobileAuthCallback({ url });
	});

	const launchUrl = await App.getLaunchUrl();
	if (nonNullish(launchUrl)) {
		await handleMobileAuthCallback(launchUrl);
	}
};
