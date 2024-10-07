import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { getPendingBtcTransactions } from '$lib/api/backend.api';
import type { NetworkId } from '$lib/types/network';
import { mapNetworkIdToBitcoinNetwork, mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import type { Identity } from '@dfinity/agent';

export const loadBtcPendingSentTransactions = async ({
	address,
	identity,
	networkId
}: {
	address: string;
	identity: Identity;
	networkId: NetworkId;
}) => {
	try {
		const network = mapNetworkIdToBitcoinNetwork(networkId);
		if (!network) {
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
	} catch (err: unknown) {
		console.error('Error loading pending transactions', err);
		btcPendingSentTransactionsStore.setPendingTransactionsError({ address });
	}
};
