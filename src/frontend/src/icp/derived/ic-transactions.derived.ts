import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
import { ckEthPendingTransactions } from '$icp/derived/cketh-transactions.derived';
import { btcStatusesStore } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { icTransactionsStore, type IcTransactionsData } from '$icp/stores/ic-transactions.store';
import { extendIcTransaction, getAllIcTransactions } from '$icp/utils/ic-transactions.utils';
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
	[
		tokenWithFallback,
		ckBtcPendingUtxoTransactions,
		ckEthPendingTransactions,
		icExtendedTransactions,
		btcStatusesStore,
		ckBtcMinterInfoStore,
		ckBtcPendingUtxosStore,
		icPendingTransactionsStore,
		icTransactionsStore
	],
	([
		$token,
		$ckBtcPendingUtxoTransactions,
		$ckEthPendingTransactions,
		$icExtendedTransactions,
		$btcStatusesStore,
		$ckBtcMinterInfoStore,
		$ckBtcPendingUtxosStore,
		$icPendingTransactionsStore,
		$icTransactionsStore
	]) =>
		getAllIcTransactions({
			token: $token,
			ckBtcPendingUtxoTransactions: $ckBtcPendingUtxoTransactions,
			ckBtcPendingUtxosStore: $ckBtcPendingUtxosStore,
			ckEthPendingTransactions: $ckEthPendingTransactions,
			ckBtcMinterInfoStore: $ckBtcMinterInfoStore,
			btcStatusesStore: $btcStatusesStore,
			icPendingTransactionsStore: $icPendingTransactionsStore,
			icExtendedTransactions: $icExtendedTransactions,
			icTransactionsStore: $icTransactionsStore
		})
);
