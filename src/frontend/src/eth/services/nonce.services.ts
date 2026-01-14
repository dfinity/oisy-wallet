import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthAddress } from '$eth/types/address';
import type { NetworkId } from '$lib/types/network';

export const getNonce = async ({ from, networkId }: { from: EthAddress; networkId: NetworkId }) => {
	const { getTransactionCount } = infuraProviders(networkId);

	return await getTransactionCount({ address: from, tag: 'pending' });
};
