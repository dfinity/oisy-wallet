import { transactionsStore } from '$eth/stores/transactions.store';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { Transaction } from '$lib/types/transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Readable } from 'svelte/store';
import { derived } from 'svelte/store';

export const sortedTransactions: Readable<Transaction[]> = derived(
	[transactionsStore, tokenWithFallback],
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

export const transactionsInitialized: Readable<boolean> = derived(
	[transactionsStore, tokenWithFallback],
	([$transactionsStore, { id: $tokenId }]) => nonNullish($transactionsStore?.[$tokenId])
);

export const transactionsNotInitialized: Readable<boolean> = derived(
	[transactionsInitialized],
	([$transactionsInitialized]) => !$transactionsInitialized
);
