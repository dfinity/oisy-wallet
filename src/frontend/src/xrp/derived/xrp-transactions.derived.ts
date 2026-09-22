import { tokenWithFallback } from '$lib/derived/token.derived';
import { sortTransactions } from '$lib/utils/transactions.utils';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const xrpTransactions: Readable<XrpTransactionUi[]> = derived(
	[tokenWithFallback, xrpTransactionsStore],
	([$token, $xrpTransactionsStore]) =>
		($xrpTransactionsStore?.[$token.id] ?? [])
			.map(({ data: transaction }) => transaction)
			.sort((transactionA, transactionB) => sortTransactions({ transactionA, transactionB }))
);

export const xrpTransactionsInitialized: Readable<boolean> = derived(
	[xrpTransactionsStore, tokenWithFallback],
	([$xrpTransactionsStore, { id: $tokenId }]) => nonNullish($xrpTransactionsStore?.[$tokenId])
);

export const xrpTransactionsNotInitialized: Readable<boolean> = derived(
	[xrpTransactionsInitialized],
	([$xrpTransactionsInitialized]) => !$xrpTransactionsInitialized
);
