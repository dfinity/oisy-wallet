import { btcStatusesStore } from '$icp/stores/btc.store';
import { icTransactionsStore, type IcTransactionsData } from '$icp/stores/ic-transactions.store';
import { extendIcTransaction } from '$icp/utils/ic-transactions.utils';
import { token } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

export const icTransactions: Readable<IcTransactionsData> = derived(
	[token, icTransactionsStore, btcStatusesStore],
	([$token, $icTransactionsStore, $btcStatusesStore]) =>
		($icTransactionsStore?.[$token.id] ?? []).map((transaction) =>
			extendIcTransaction({
				transaction,
				token: $token,
				btcStatuses: $btcStatusesStore?.[$token.id] ?? undefined
			})
		)
);
