import { tokenWithFallback } from '$lib/derived/token.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { TokenId } from '$lib/types/token';
import type { AnyTransactionUiWithToken } from '$lib/types/transaction-ui';
import type { KnownDestinations } from '$lib/types/transactions';
import { getKnownDestinations, sortTransactions } from '$lib/utils/transactions.utils';
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

export const xrpKnownDestinations: Readable<KnownDestinations> = derived(
	[xrpTransactionsStore, tokens],
	([$xrpTransactionsStore, $tokens]) => {
		const tokenById = new Map($tokens.map((token) => [token.id, token]));

		const mappedTransactions: AnyTransactionUiWithToken[] = [];
		Object.getOwnPropertySymbols($xrpTransactionsStore ?? {}).forEach((tokenId) => {
			const token = tokenById.get(tokenId as TokenId);

			if (nonNullish(token)) {
				($xrpTransactionsStore?.[tokenId as TokenId] ?? []).forEach(({ data }) => {
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
