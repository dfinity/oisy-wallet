import {
	MOBILE_AUTH_ALLOWED_REDIRECT_URIS,
	MOBILE_AUTH_BRIDGE_PATH,
	MOBILE_AUTH_DELEGATION_PARAM,
	MOBILE_AUTH_REDIRECT_URI_PARAM,
	MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM
} from '$lib/constants/mobile-auth.constants';
import { isNullish, notEmptyString } from '@dfinity/utils';

export const isAllowedMobileAuthRedirectUri = (redirectUri: string | null | undefined): boolean =>
	notEmptyString(redirectUri) && MOBILE_AUTH_ALLOWED_REDIRECT_URIS.includes(redirectUri);

const HEX_REGEX = /^(?:[0-9a-fA-F]{2})+$/;

export const isValidHexPublicKey = (publicKey: string | null | undefined): boolean =>
	notEmptyString(publicKey) && HEX_REGEX.test(publicKey);

export const buildMobileAuthBridgeUrl = ({
	baseUrl,
	sessionPublicKeyDerHex,
	redirectUri
}: {
	baseUrl: string;
	sessionPublicKeyDerHex: string;
	redirectUri: string;
}): string => {
	const url = new URL(MOBILE_AUTH_BRIDGE_PATH, baseUrl);
	url.searchParams.set(MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM, sessionPublicKeyDerHex);
	url.searchParams.set(MOBILE_AUTH_REDIRECT_URI_PARAM, redirectUri);
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
