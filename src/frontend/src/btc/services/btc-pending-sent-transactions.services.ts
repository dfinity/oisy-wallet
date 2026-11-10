import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { BTC_SEND_VIA_BACKEND_ENABLED } from '$env/btc.env';
import { getPendingBtcTransactions, getSpendableBtcUtxos } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { freshIIDelegationChain } from '$lib/utils/delegation.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mapNetworkIdToBitcoinNetwork, mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Loads the caller's pending BTC transactions into `btcPendingSentTransactionsStore`.
 *
 * With `BTC_SEND_VIA_BACKEND_ENABLED`, the same `btc_get_spendable_utxos` call also fills
 * `allUtxosStore`, so the UTXOs and the transactions reserving them come from one snapshot, and the
 * re-checks before a send refresh both.
 */
export const loadBtcPendingSentTransactions = async ({
	address,
	identity,
	networkId
}: {
	address: string;
	identity: NullishIdentity;
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
		const params = {
			identity,
			network: mapToSignerBitcoinNetwork({ network }),
			iiDelegationChain: await freshIIDelegationChain({ identity })
		};

		if (BTC_SEND_VIA_BACKEND_ENABLED) {
			const { utxos, pending_transactions } = await getSpendableBtcUtxos(params);

			allUtxosStore.setAllUtxos({ allUtxos: utxos });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address,
				pendingTransactions: pending_transactions
			});

			return { success: true };
		}

		const pendingTransactions = await getPendingBtcTransactions(params);
		btcPendingSentTransactionsStore.setPendingTransactions({
			address,
			pendingTransactions: pendingTransactions.response
		});
		return { success: true };
	} catch (err: unknown) {
		consoleError('Error loading pending transactions', err);
		btcPendingSentTransactionsStore.setPendingTransactionsError({ address });

		// The UTXOs come from the same call. With none loaded, the fee would wait for them forever;
		// an empty list lets it report the missing pending transactions instead, as it does when
		// only those fail. UTXOs already loaded are kept: the pending error alone stops a send.
		if (BTC_SEND_VIA_BACKEND_ENABLED && isNullish(get(allUtxosStore)?.allUtxos)) {
			allUtxosStore.setAllUtxos({ allUtxos: [] });
		}

		return { success: false, err };
	}
};
