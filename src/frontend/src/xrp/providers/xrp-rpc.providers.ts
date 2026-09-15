import { XRP_RPC_HTTP_URL_MAINNET } from '$env/networks/networks.xrp.env';
import { XrpNetworks, type XrpNetworkType } from '$xrp/types/network';
import { assertNonNullish } from '@dfinity/utils';

const rpcHttpUrls: Record<XrpNetworkType, string | undefined> = {
	[XrpNetworks.mainnet]: XRP_RPC_HTTP_URL_MAINNET
};

export const xrpHttpRpcUrl = (network: XrpNetworkType): string => {
	const url = rpcHttpUrls[network];

	assertNonNullish(
		url,
		'No XRPL RPC endpoint is configured for this build. Set VITE_XRP_RPC_URL_MAINNET to a managed provider endpoint.'
	);

	return url;
};
