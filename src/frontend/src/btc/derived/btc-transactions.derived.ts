import { btcTransactionsStore, type BtcTransactionsData } from '$btc/stores/btc-transactions.store';
import { sortBtcTransactions } from '$btc/utils/btc-transactions.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const sortedBtcTransactions: Readable<NonNullable<BtcTransactionsData>> = derived(
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
