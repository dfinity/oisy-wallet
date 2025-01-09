import { tokenWithFallback } from '$lib/derived/token.derived';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const solTransactions: Readable<SolTransactionUi[]> = derived(
	[tokenWithFallback, solTransactionsStore],
	([$token, $solTransactionsStore]) =>
		($solTransactionsStore?.[$token.id] ?? []).map(({ data: transaction }) => transaction)
);

export const solTransactionsInitialized: Readable<boolean> = derived(
	[solTransactionsStore, tokenWithFallback],
	([$solTransactionsStore, { id: $tokenId }]) => nonNullish($solTransactionsStore?.[$tokenId])
);

export const solTransactionsNotInitialized: Readable<boolean> = derived(
	[solTransactionsInitialized],
	([$solTransactionsInitialized]) => !$solTransactionsInitialized
);
