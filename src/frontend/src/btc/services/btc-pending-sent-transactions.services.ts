import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { getPendingBtcTransactions } from '$lib/api/backend.api';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { mapNetworkIdToBitcoinNetwork, mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const loadBtcPendingSentTransactions = async ({
	address,
	identity,
	networkId
}: {
	address: string;
	identity: OptionIdentity;
	networkId?: NetworkId;
}): Promise<ResultSuccess> => {
	try {
		if (isNullish(identity)) {
			return {
				success: false,
				err: new Error('Identity not found')
			};
		}
		const network = nonNullish(networkId) ? mapNetworkIdToBitcoinNetwork(networkId) : undefined;
		if (isNullish(network)) {
			return {
				success: false,
				err: new Error(
					`Invalid networkId: ${nonNullish(networkId) ? networkId.toString : 'undefined'}`
				)
			};
		}
		const pendingTransactions = await getPendingBtcTransactions({
			identity,
			address,
			network: mapToSignerBitcoinNetwork({ network })
		});
		btcPendingSentTransactionsStore.setPendingTransactions({
			address,
			pendingTransactions
		});
		return { success: true };
	} catch (err: unknown) {
		console.error('Error loading pending transactions', err);
		btcPendingSentTransactionsStore.setPendingTransactionsError({ address });
		return { success: false, err };
	}
};
