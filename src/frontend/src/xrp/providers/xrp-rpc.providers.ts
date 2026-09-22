import { XRP_RPC_HTTP_URL_MAINNET } from '$env/rest/xrpl.env';
import { XrpNetworks, type XrpNetworkType } from '$xrp/types/network';
import { isNullish } from '@dfinity/utils';

const rpcHttpUrls: Record<XrpNetworkType, string | undefined> = {
	[XrpNetworks.mainnet]: XRP_RPC_HTTP_URL_MAINNET
};

/**
 * No endpoint is configured for this build.
 *
 * Typed because it is the one failure on the send path that provably happens BEFORE any request:
 * the url is resolved from a build-time constant, so nothing has been broadcast and nothing can
 * have been. Every other failure a submit can raise — a rejected `fetch`, a non-ok status, a
 * malformed body — follows a request that may already have been processed, and those must stay
 * ambiguous. `submitAndConfirmXrpTransaction` rethrows this one instead of polling a budget
 * against an endpoint it cannot reach and calling the outcome unknown.
 */
export class XrpRpcNotConfiguredError extends Error {}

export const xrpHttpRpcUrl = (network: XrpNetworkType): string => {
	const url = rpcHttpUrls[network];

	if (isNullish(url)) {
		throw new XrpRpcNotConfiguredError(
			'No XRPL RPC endpoint is configured for this build. Set VITE_XRP_RPC_URL_MAINNET to a managed provider endpoint.'
		);
	}

	return url;
};
