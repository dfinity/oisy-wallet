import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthAddress } from '$eth/types/address';
import { EthNonceReadError } from '$eth/types/send';
import type { NetworkId } from '$lib/types/network';

export const getNonce = async ({ from, networkId }: { from: EthAddress; networkId: NetworkId }) => {
	const { getTransactionCount } = infuraProviders(networkId);

	try {
		return await getTransactionCount({ address: from, tag: 'pending' });
	} catch (err: unknown) {
		// Nothing is signed without its nonce, so the transaction this read was for is known not to
		// have been sent.
		throw new EthNonceReadError(err);
	}
};
