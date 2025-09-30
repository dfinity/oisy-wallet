import { nativeEthereumTokenId } from '$eth/derived/token.derived';
import { ethTransactionsStore, type EthTransactionsData } from '$eth/stores/eth-transactions.store';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import { ethAddress } from '$lib/derived/address.derived';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { TokenId } from '$lib/types/token';
import type { AnyTransactionUiWithToken } from '$lib/types/transaction';
import type { KnownDestinations } from '$lib/types/transactions';
import { getKnownDestinations } from '$lib/utils/transactions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const sortedEthTransactions: Readable<NonNullable<EthTransactionsData>> = derived(
	[ethTransactionsStore, tokenWithFallback],
	([$transactionsStore, { id: $tokenId }]) =>
		($transactionsStore?.[$tokenId] ?? []).sort(
			(
				{ data: { blockNumber: blockNumberA, pendingTimestamp: pendingTimestampA } },
				{ data: { blockNumber: blockNumberB, pendingTimestamp: pendingTimestampB } }
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
	[
		ethTransactionsStore,
		ckEthMinterInfoStore,
		nativeEthereumTokenId,
		ethAddress,
		tokens,
		tokenWithFallback
	],
	([
		$ethTransactionsStore,
		$ckEthMinterInfoStore,
		$ethereumTokenId,
		$ethAddress,
		$tokens,
		$tokenWithFallback
	]) => {
		const ckMinterInfoAddresses = toCkMinterInfoAddresses(
			$ckEthMinterInfoStore?.[$ethereumTokenId]
		);

		if (ckMinterInfoAddresses.length === 0) {
			return {};
		}

		const mappedTransactions: AnyTransactionUiWithToken[] = [];
		Object.getOwnPropertySymbols($ethTransactionsStore ?? {}).forEach((tokenId) => {
			const token = $tokens.find(({ id }) => id === tokenId);

			if (nonNullish(token) && token.network.id === $tokenWithFallback.network.id) {
				($ethTransactionsStore?.[tokenId as TokenId] ?? []).forEach(({ data: transaction }) => {
					mappedTransactions.push({
						...mapEthTransactionUi({
							transaction,
							ckMinterInfoAddresses,
							ethAddress: $ethAddress
						}),
						token
					});
				});
			}
		});

		return getKnownDestinations(mappedTransactions);
	}
);
