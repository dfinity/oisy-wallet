import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { AppPath, URI_PARAM } from '$lib/constants/routes.constants';
import { isNullish } from '@dfinity/utils';

const WALLET_CONNECT_URI_PREFIX = 'wc:';

/**
 * Outcome of resolving a scanned/pasted code against the WalletConnect forms:
 * - `{ type: 'uri' }` — a usable `wc:` URI (a bare URI, or one unwrapped from an
 *   OISY WalletConnect deep-link URL on OISY's own host).
 * - `{ type: 'wrong-domain' }` — a well-formed OISY WalletConnect deep-link URL
 *   (`/wc/?uri=<wc: uri>`) whose host is **not** OISY's own domain. The pairing
 *   content is valid, only the domain is off, so callers can surface a distinct
 *   error rather than the generic invalid-code one.
 * - `undefined` — not a WalletConnect code at all; callers continue classifying.
 */
export type ScannedWalletConnectUri = { type: 'uri'; uri: string } | { type: 'wrong-domain' };

/**
 * Resolves a scanned/pasted code to a WalletConnect URI. Accepts a bare `wc:`
 * URI, or an OISY WalletConnect deep-link URL
 * (`<OISY origin>/wc/?uri=<url-encoded wc: uri>`). The URL form is only unwrapped
 * when its host is OISY's own domain; an otherwise well-formed deep link on a
 * different host resolves to `wrong-domain` so it is never paired.
 */
export const extractWalletConnectUri = (code: string): ScannedWalletConnectUri | undefined => {
	if (code.startsWith(WALLET_CONNECT_URI_PREFIX)) {
		return { type: 'uri', uri: code };
	}

	let url: URL;
	try {
		url = new URL(code);
	} catch (_: unknown) {
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

	if (url.hostname !== OISY_URL_HOSTNAME) {
		return { type: 'wrong-domain' };
	}

	return { type: 'uri', uri };
};
