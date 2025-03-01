import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { btcTransactionsStore, type BtcTransactionsData } from '$btc/stores/btc-transactions.store';
import { sortBtcTransactions } from '$btc/utils/btc-transactions.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { isNullish, nonNullish } from '@dfinity/utils';
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

export const btcTransactionsLoading: Readable<boolean> = derived(
	[btcTransactionsStore, enabledBitcoinTokens],
	([$btcTransactionsStore, $enabledBitcoinTokens]) =>
		isNullish($btcTransactionsStore) ||
		Object.getOwnPropertySymbols($btcTransactionsStore).length !== $enabledBitcoinTokens.length
);
