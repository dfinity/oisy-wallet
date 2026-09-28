import {
	MOBILE_AUTH_ALLOWED_REDIRECT_URIS,
	MOBILE_AUTH_BRIDGE_PATH,
	MOBILE_AUTH_CALLBACK_URI,
	MOBILE_AUTH_DELEGATION_PARAM,
	MOBILE_AUTH_ICRC167_CALLBACK_PARAM,
	MOBILE_AUTH_ICRC167_MESSAGE_PARAM,
	MOBILE_AUTH_ICRC167_STATE_PARAM,
	MOBILE_AUTH_OPENID_PROVIDER_PARAM,
	MOBILE_AUTH_REDIRECT_URI_PARAM,
	MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM
} from '$lib/constants/mobile-auth.constants';
import type { OpenIdProvider } from '$lib/types/auth';
import { base64ToUint8Array, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import type { DerEncodedPublicKey, Signature } from '@icp-sdk/core/agent';
import { Delegation, DelegationChain } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';

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

// =============================================================================
// ICRC-167 redirect transport (phase 2)
// =============================================================================

/**
 * Builds the ICRC-167 URL that opens Internet Identity with an
 * `icrc34_delegation` request. II returns the delegation by navigating to
 * `callbackUrl` — a universal link on the canonical origin, routed by the OS
 * into the app. Omitting `targets` yields a relying-party delegation, whose
 * principal derives from the callback URL's origin: the same principal as a
 * web login on that origin.
 */
export const buildIcrc167DelegationUrl = ({
	transportUrl,
	callbackUrl,
	sessionPublicKeyDerBase64,
	maxTimeToLive,
	state
}: {
	transportUrl: string;
	callbackUrl: string;
	sessionPublicKeyDerBase64: string;
	maxTimeToLive: bigint;
	state: string;
}): string => {
	const message = JSON.stringify({
		jsonrpc: '2.0',
		id: 1,
		method: 'icrc34_delegation',
		params: {
			publicKey: sessionPublicKeyDerBase64,
			maxTimeToLive: maxTimeToLive.toString()
		}
	});

	const params = new URLSearchParams({
		[MOBILE_AUTH_ICRC167_MESSAGE_PARAM]: message,
		[MOBILE_AUTH_ICRC167_CALLBACK_PARAM]: callbackUrl,
		[MOBILE_AUTH_ICRC167_STATE_PARAM]: state
	});

	return `${transportUrl}#${params.toString()}`;
};

// Exact origin + path match against the universal-link callback. Query and
// fragment are where the response rides, so they are deliberately not part of
// the identity check.
export const isIcrc167CallbackUrl = ({
	url,
	callbackUrl
}: {
	url: string;
	callbackUrl: string;
}): boolean => {
	let parsed: URL;
	let expected: URL;
	try {
		parsed = new URL(url);
		expected = new URL(callbackUrl);
	} catch (_err: unknown) {
		return false;
	}

	return parsed.origin === expected.origin && parsed.pathname === expected.pathname;
};

/**
 * Parses the ICRC-167 callback fragment and maps the `icrc34_delegation`
 * JSON-RPC result into a {@link DelegationChain}.
 *
 * Returns `undefined` for a malformed callback; throws only if the payload is
 * well-formed JSON-RPC but carries an error object, so the caller can surface
 * the signer-reported reason.
 */
export const parseIcrc167CallbackUrl = (
	url: string
): { chain: DelegationChain; state: string | undefined } | undefined => {
	let hash: string;
	try {
		({ hash } = new URL(url));
	} catch (_err: unknown) {
		return undefined;
	}

	const params = new URLSearchParams(hash.replace(/^#/, ''));
	const rawMessage = params.get(MOBILE_AUTH_ICRC167_MESSAGE_PARAM);
	const state = params.get(MOBILE_AUTH_ICRC167_STATE_PARAM) ?? undefined;

	if (isNullish(rawMessage) || !notEmptyString(rawMessage)) {
		return undefined;
	}

	let message: unknown;
	try {
		message = JSON.parse(rawMessage);
	} catch (_err: unknown) {
		return undefined;
	}

	// ICRC-167 allows batch responses; the app only ever sends a single request.
	const response = Array.isArray(message) ? message[0] : message;

	if (isNullish(response) || typeof response !== 'object') {
		return undefined;
	}

	if ('error' in response && nonNullish(response.error)) {
		const { code, message: errMessage } = response.error as { code?: number; message?: string };
		throw new Error(`Signer error ${code ?? 'unknown'}: ${errMessage ?? 'no message'}`);
	}

	if (!('result' in response)) {
		return undefined;
	}

	const { publicKey, signerDelegation } = (response.result ?? {}) as {
		publicKey?: string;
		signerDelegation?: {
			delegation?: { pubkey?: string; expiration?: string; targets?: string[] };
			signature?: string;
		}[];
	};

	if (!notEmptyString(publicKey) || !Array.isArray(signerDelegation)) {
		return undefined;
	}

	try {
		const delegations = signerDelegation.map(({ delegation, signature }) => {
			if (
				isNullish(delegation) ||
				!notEmptyString(delegation.pubkey) ||
				!notEmptyString(delegation.expiration) ||
				!notEmptyString(signature)
			) {
				throw new Error('Malformed signer delegation');
			}

			return {
				delegation: new Delegation(
					base64ToUint8Array(delegation.pubkey),
					BigInt(delegation.expiration),
					delegation.targets?.map((t) => Principal.fromText(t))
				),
				signature: base64ToUint8Array(signature) as Signature
			};
		});

		const chain = DelegationChain.fromDelegations(
			delegations,
			base64ToUint8Array(publicKey) as DerEncodedPublicKey
		);

		return { chain, state };
	} catch (_err: unknown) {
		return undefined;
	}
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
