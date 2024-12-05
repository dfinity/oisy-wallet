import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { Transaction } from '$lib/types/transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const sortedEthTransactions: Readable<Transaction[]> = derived(
	[ethTransactionsStore, tokenWithFallback],
	([$transactionsStore, { id: $tokenId }]) =>
		($transactionsStore?.[$tokenId] ?? []).sort(
			(
				{ blockNumber: blockNumberA, pendingTimestamp: pendingTimestampA },
				{ blockNumber: blockNumberB, pendingTimestamp: pendingTimestampB }
			) => {
				if (isNullish(blockNumberA) && isNullish(pendingTimestampA)) {
					return -1;
				}

				if (isNullish(blockNumberB) && isNullish(pendingTimestampB)) {
					return -1;
				}

				if (nonNullish(blockNumberA) && nonNullish(blockNumberB)) {
					return blockNumberB - blockNumberA;
				}

				if (nonNullish(pendingTimestampA) && nonNullish(pendingTimestampB)) {
					return pendingTimestampB - pendingTimestampA;
				}

				return nonNullish(pendingTimestampA) ? -1 : 1;
			}
		)
);

export const ethTransactionsInitialized: Readable<boolean> = derived(
	[ethTransactionsStore, tokenWithFallback],
	([$ethTransactionsStore, { id: $tokenId }]) => nonNullish($ethTransactionsStore?.[$tokenId])
);

export const ethTransactionsNotInitialized: Readable<boolean> = derived(
	[ethTransactionsInitialized],
	([$ethTransactionsInitialized]) => !$ethTransactionsInitialized
);
