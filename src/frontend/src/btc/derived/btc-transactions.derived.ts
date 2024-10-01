import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { TransactionsData } from '$lib/stores/transactions.store';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

// TODO: decide how BTC transactions should be sorted and apply it here
export const sortedTransactions: Readable<TransactionsData<BtcTransactionUi>> = derived(
	[btcTransactionsStore, tokenWithFallback],
	([$transactionsStore, $token]) => $transactionsStore?.[$token.id] ?? []
);

export const transactionsInitialized: Readable<boolean> = derived(
	[btcTransactionsStore, tokenWithFallback],
	([$transactionsStore, { id: $tokenId }]) => nonNullish($transactionsStore?.[$tokenId])
);

export const transactionsNotInitialized: Readable<boolean> = derived(
	[transactionsInitialized],
	([$transactionsInitialized]) => !$transactionsInitialized
);
