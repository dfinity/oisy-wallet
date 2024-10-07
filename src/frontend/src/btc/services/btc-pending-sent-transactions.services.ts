import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { getPendingBtcTransactions } from '$lib/api/backend.api';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { mapNetworkIdToBitcoinNetwork, mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import type { Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';

export const loadBtcPendingSentTransactions = async ({
	address,
	identity,
	networkId
}: {
	address: string;
	identity: Identity;
	networkId: NetworkId;
}): Promise<ResultSuccess> => {
	try {
		const network = mapNetworkIdToBitcoinNetwork(networkId);
		if (isNullish(network)) {
			throw new Error(`Invalid networkId: ${networkId.toString}`);
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
