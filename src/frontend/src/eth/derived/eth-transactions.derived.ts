import { ethereumTokenId } from '$eth/derived/token.derived';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import { ethAddress } from '$lib/derived/address.derived';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { Transaction } from '$lib/types/transaction';
import type { KnownDestinations } from '$lib/types/transactions';
import { getKnownDestinations } from '$lib/utils/transactions.utils';
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

export const ethKnownDestinations: Readable<KnownDestinations> = derived(
	[sortedEthTransactions, ckEthMinterInfoStore, ethereumTokenId, ethAddress],
	([$sortedEthTransactions, $ckEthMinterInfoStore, $ethereumTokenId, $ethAddress]) => {
		const ckMinterInfoAddresses = toCkMinterInfoAddresses(
			$ckEthMinterInfoStore?.[$ethereumTokenId]
		);

		if (ckMinterInfoAddresses.length === 0) {
			return {};
		}

		const mappedTransactions = $sortedEthTransactions.map((transaction) =>
			mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				$ethAddress
			})
		);

		return getKnownDestinations(mappedTransactions);
	}
);
