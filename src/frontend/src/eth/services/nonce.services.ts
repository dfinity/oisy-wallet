import { ethProviders } from '$eth/providers/eth.providers';
import type { EthAddress } from '$eth/types/address';
import type { NetworkId } from '$lib/types/network';

export const getNonce = async ({ from, networkId }: { from: EthAddress; networkId: NetworkId }) => {
	const { getTransactionCount } = ethProviders(networkId);

	return await getTransactionCount({ address: from, tag: 'pending' });
};
