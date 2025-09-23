import { btcTransactionsStore, type BtcTransactionsData } from '$btc/stores/btc-transactions.store';
import { sortBtcTransactions } from '$btc/utils/blockchain-transactions.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { TokenId } from '$lib/types/token';
import type { AnyTransactionUiWithToken } from '$lib/types/transaction';
import type { KnownDestinations } from '$lib/types/transactions';
import { getKnownDestinations } from '$lib/utils/transactions.utils';
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

export const btcKnownDestinations: Readable<KnownDestinations | undefined> = derived(
	[btcTransactionsStore, tokens],
	([$btcTransactionsStore, $tokens]) => {
		const mappedTransactions: AnyTransactionUiWithToken[] = [];
		Object.getOwnPropertySymbols($btcTransactionsStore ?? {}).forEach((tokenId) => {
			const token = $tokens.find(({ id }) => id === tokenId);

			if (nonNullish(token)) {
				($btcTransactionsStore?.[tokenId as TokenId] ?? []).forEach(({ data }) => {
					mappedTransactions.push({
						...data,
						token
					});
				});
			}
		});

		return getKnownDestinations(mappedTransactions);
	}
);
