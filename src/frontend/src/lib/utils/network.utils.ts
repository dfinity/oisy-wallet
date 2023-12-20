import { invalidateAll } from '$app/navigation';
import type { NetworkId } from '$lib/types/network';
import { replaceNetworkParamUrl } from '$lib/utils/nav.utils';

export const switchNetwork = async (networkId: NetworkId) => {
	replaceNetworkParamUrl(networkId);
	await invalidateAll();
};
