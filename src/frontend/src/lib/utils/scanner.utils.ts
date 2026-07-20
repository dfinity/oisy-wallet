import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { AppPath, URI_PARAM } from '$lib/constants/routes.constants';
import { isNullish } from '@dfinity/utils';

const WALLET_CONNECT_URI_PREFIX = 'wc:';

/**
 * Resolves a scanned/pasted code to a WalletConnect URI, or `undefined` if it is
 * not one. Accepts a bare `wc:` URI, or an OISY WalletConnect deep-link URL
 * (`<OISY origin>/wc/?uri=<url-encoded wc: uri>`). The URL form is only unwrapped
 * when its host is OISY's own domain, so a `uri` param from any other origin is
 * never treated as a pairing.
 */
export const extractWalletConnectUri = (code: string): string | undefined => {
	if (code.startsWith(WALLET_CONNECT_URI_PREFIX)) {
		return code;
	}

	let url: URL;
	try {
		url = new URL(code);
	} catch (_: unknown) {
		return undefined;
	}

	if (url.hostname !== OISY_URL_HOSTNAME) {
		return undefined;
	}

	// AppPath.WalletConnect is '/wc/'; tolerate a missing trailing slash.
	const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
	if (path !== AppPath.WalletConnect) {
		return undefined;
	}

	// URLSearchParams.get already percent-decodes the value.
	const uri = url.searchParams.get(URI_PARAM);
	if (isNullish(uri) || !uri.startsWith(WALLET_CONNECT_URI_PREFIX)) {
		return undefined;
	}

	return uri;
};
