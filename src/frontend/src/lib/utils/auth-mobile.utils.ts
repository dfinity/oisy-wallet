import {
	MOBILE_AUTH_ALLOWED_REDIRECT_URIS,
	MOBILE_AUTH_BRIDGE_PATH,
	MOBILE_AUTH_CALLBACK_URI,
	MOBILE_AUTH_DELEGATION_PARAM,
	MOBILE_AUTH_OPENID_PROVIDER_PARAM,
	MOBILE_AUTH_REDIRECT_URI_PARAM,
	MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM
} from '$lib/constants/mobile-auth.constants';
import type { OpenIdProvider } from '$lib/types/auth';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

// Mirrors the `OpenIdProvider` union — the SDK's literal provider identifiers.
const OPENID_PROVIDERS: readonly OpenIdProvider[] = ['google', 'apple', 'microsoft'];

export const isOpenIdProvider = (value: Nullish<string>): value is OpenIdProvider =>
	notEmptyString(value) && OPENID_PROVIDERS.includes(value as OpenIdProvider);

export const isAllowedMobileAuthRedirectUri = (redirectUri: Nullish<string>): boolean =>
	notEmptyString(redirectUri) && MOBILE_AUTH_ALLOWED_REDIRECT_URIS.includes(redirectUri);

// DER-encoded Ed25519 public key (RFC 8410): the fixed 12-byte
// SubjectPublicKeyInfo prefix (OID 1.3.101.112) followed by the 32-byte raw
// key. The session key is always generated with `Ed25519KeyIdentity`, so any
// other shape is a malformed request — reject it up front instead of letting
// it fail later inside the sign-in flow.
const ED25519_DER_PUBLIC_KEY_REGEX = /^302a300506032b6570032100[0-9a-f]{64}$/i;

export const isValidEd25519DerPublicKey = (publicKey: Nullish<string>): boolean =>
	notEmptyString(publicKey) && ED25519_DER_PUBLIC_KEY_REGEX.test(publicKey);

export const buildMobileAuthBridgeUrl = ({
	baseUrl,
	sessionPublicKeyDerHex,
	redirectUri,
	openIdProvider
}: {
	baseUrl: string;
	sessionPublicKeyDerHex: string;
	redirectUri: string;
	openIdProvider?: OpenIdProvider;
}): string => {
	const url = new URL(MOBILE_AUTH_BRIDGE_PATH, baseUrl);
	url.searchParams.set(MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM, sessionPublicKeyDerHex);
	url.searchParams.set(MOBILE_AUTH_REDIRECT_URI_PARAM, redirectUri);
	if (nonNullish(openIdProvider)) {
		url.searchParams.set(MOBILE_AUTH_OPENID_PROVIDER_PARAM, openIdProvider);
	}
	return url.toString();
};

// The delegation chain rides in the URL fragment: browsers never send
// fragments over the network, so the chain cannot end up in server logs or
// Referer headers on its way back to the app.
export const buildMobileAuthCallbackUrl = ({
	redirectUri,
	delegationChainJson
}: {
	redirectUri: string;
	delegationChainJson: string;
}): string =>
	`${redirectUri}#${MOBILE_AUTH_DELEGATION_PARAM}=${encodeURIComponent(delegationChainJson)}`;

// Exact scheme + host match against the callback URI. A `startsWith` check
// would accept prefix lookalikes such as `oisy://auth-callback.evil/#…`, so
// we parse and compare the authority components instead — mirroring the
// exact-match allowlist used on the bridge side.
export const isMobileAuthCallbackUrl = (url: string): boolean => {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch (_err: unknown) {
		return false;
	}

	const expected = new URL(MOBILE_AUTH_CALLBACK_URI);
	return parsed.protocol === expected.protocol && parsed.host === expected.host;
};

export const parseMobileAuthCallbackUrl = (url: string): string | undefined => {
	let hash: string;
	try {
		({ hash } = new URL(url));
	} catch (_err: unknown) {
		return undefined;
	}

	const delegation = new URLSearchParams(hash.replace(/^#/, '')).get(MOBILE_AUTH_DELEGATION_PARAM);

	return isNullish(delegation) || !notEmptyString(delegation) ? undefined : delegation;
};
