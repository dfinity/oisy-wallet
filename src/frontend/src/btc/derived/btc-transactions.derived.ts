import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { sortBtcTransactions } from '$btc/utils/btc-transactions.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { TransactionsData } from '$lib/stores/transactions.store';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const sortedBtcTransactions: Readable<TransactionsData<BtcTransactionUi>> = derived(
	[btcTransactionsStore, tokenWithFallback],
	([$transactionsStore, $token]) =>
		($transactionsStore?.[$token.id] ?? []).sort(({ data: transactionA }, { data: transactionB }) =>
			sortBtcTransactions({ transactionA, transactionB })
		)
);

export const btcTransactionsInitialized: Readable<boolean> = derived(
	[btcTransactionsStore, tokenWithFallback],
	([$btcTransactionsStore, { id: $tokenId }]) => nonNullish($btcTransactionsStore?.[$tokenId])
);

export const btcTransactionsNotInitialized: Readable<boolean> = derived(
	[btcTransactionsInitialized],
	([$btcTransactionsInitialized]) => !$btcTransactionsInitialized
);
