import { XRP_RPC_HTTP_URL_MAINNET } from '$env/networks/networks.xrp.env';
import { XrpNetworks, type XrpNetworkType } from '$xrp/types/network';

const rpcHttpUrls: Record<XrpNetworkType, string> = {
	[XrpNetworks.mainnet]: XRP_RPC_HTTP_URL_MAINNET
};

export const xrpHttpRpcUrl = (network: XrpNetworkType): string => rpcHttpUrls[network];
