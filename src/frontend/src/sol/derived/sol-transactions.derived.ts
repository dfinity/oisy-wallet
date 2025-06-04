import { tokenWithFallback } from '$lib/derived/token.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { TokenId } from '$lib/types/token';
import type { AnyTransactionUiWithToken } from '$lib/types/transaction';
import type { KnownDestinations } from '$lib/types/transactions';
import { getKnownDestinations } from '$lib/utils/transactions.utils';
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

export const solKnownDestinations: Readable<KnownDestinations> = derived(
	[solTransactionsStore, tokens],
	([$solTransactionsStore, $tokens]) => {
		const mappedTransactions: AnyTransactionUiWithToken[] = [];
		Object.getOwnPropertySymbols($solTransactionsStore ?? {}).forEach((tokenId) => {
			const token = $tokens.find(({ id }) => id === tokenId);

			if (nonNullish(token)) {
				($solTransactionsStore?.[tokenId as TokenId] ?? []).forEach(
					({ data: { from, fromOwner, to, toOwner, ...rest } }) => {
						mappedTransactions.push({
							...rest,
							from: fromOwner ?? from,
							to: toOwner ?? to,
							token
						});
					}
				);
			}
		});

		return getKnownDestinations(mappedTransactions);
	}
);
