import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
import { ckEthPendingTransactions } from '$icp/derived/cketh-transactions.derived';
import { btcStatusesStore } from '$icp/stores/btc.store';
import { icTransactionsStore, type IcTransactionsData } from '$icp/stores/ic-transactions.store';
import { extendIcTransaction } from '$icp/utils/ic-transactions.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

const icExtendedTransactions: Readable<NonNullable<IcTransactionsData>> = derived(
	[tokenWithFallback, icTransactionsStore, btcStatusesStore],
	([$token, $icTransactionsStore, $btcStatusesStore]) =>
		($icTransactionsStore?.[$token.id] ?? []).map((transaction) =>
			extendIcTransaction({
				transaction,
				token: $token,
				btcStatuses: $btcStatusesStore?.[$token.id] ?? undefined
			})
		)
);

export const icTransactions: Readable<NonNullable<IcTransactionsData>> = derived(
	[ckBtcPendingUtxoTransactions, ckEthPendingTransactions, icExtendedTransactions],
	([$ckBtcPendingUtxoTransactions, $ckEthPendingTransactions, $icExtendedTransactions]) => [
		...$ckBtcPendingUtxoTransactions,
		...$ckEthPendingTransactions,
		...$icExtendedTransactions
	]
);
