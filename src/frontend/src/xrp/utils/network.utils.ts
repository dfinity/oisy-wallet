import type { NetworkId } from '$lib/types/network';
import { isNetworkIdXRPMainnet } from '$lib/utils/network.utils';
import { XrpNetworks, type XrpNetworkType } from '$xrp/types/network';

export const mapNetworkIdToNetwork = (networkId: NetworkId): XrpNetworkType | undefined => {
	if (isNetworkIdXRPMainnet(networkId)) {
		return XrpNetworks.mainnet;
	}
};
