import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { getPendingBtcTransactions } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mapNetworkIdToBitcoinNetwork, mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

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
		const copy = get(i18n);
		if (isNullish(identity)) {
			return {
				success: false,
				err: new Error(copy.auth.error.no_internet_identity)
			};
		}
		const network = nonNullish(networkId) ? mapNetworkIdToBitcoinNetwork(networkId) : undefined;
		if (isNullish(network)) {
			const errMessage = replacePlaceholders(copy.send.error.no_btc_network_id, {
				$networkId: networkId?.toString() ?? 'undefined'
			});
			return {
				success: false,
				err: new Error(errMessage)
			};
		}
		const pendingTransactions = await getPendingBtcTransactions({
			identity,
			address,
			network: mapToSignerBitcoinNetwork({ network })
		});
		console.warn('Storing Pending transactions', pendingTransactions);
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
