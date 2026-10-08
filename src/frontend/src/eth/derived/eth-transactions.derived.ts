import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
import { erc1155Tokens } from '$eth/derived/erc1155.derived';
import { erc721Tokens } from '$eth/derived/erc721.derived';
import { nativeEthereumTokenId } from '$eth/derived/token.derived';
import { ethTransactionsStore, type EthTransactionsData } from '$eth/stores/eth-transactions.store';
import type { ErcTransfer } from '$eth/types/eth-transaction';
import {
	groupEthTransactionsByNetworkAndHash,
	mapEthTransactionUi
} from '$eth/utils/transactions.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import { ethAddress } from '$lib/derived/address.derived';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { AnyTransactionUiWithToken } from '$lib/types/transaction-ui';
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

/**
 * The loaded ERC token transfers - fungible and non-fungible - grouped by network and transaction hash.
 *
 * Lets a native transaction entry find the token transfer it paid the fee for. The index is built
 * once per store change instead of scanning every token slot per rendered row.
 */
export const ercTransfersByNetworkAndHash: Readable<Map<NetworkId, Map<string, ErcTransfer[]>>> =
	derived(
		[ethTransactionsStore, ercFungibleTokens, erc721Tokens, erc1155Tokens],
		([$ethTransactionsStore, $ercFungibleTokens, $erc721Tokens, $erc1155Tokens]) =>
			groupEthTransactionsByNetworkAndHash({
				items: [...$ercFungibleTokens, ...$erc721Tokens, ...$erc1155Tokens].flatMap((token) =>
					($ethTransactionsStore?.[token.id] ?? []).map(({ data: transaction }) => ({
						transaction,
						token
					}))
				),
				networkId: ({ token: { network } }) => network.id,
				hash: ({ transaction }) => transaction.hash
			})
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

		const tokenById = new Map($tokens.map((token) => [token.id, token]));

		const mappedTransactions: AnyTransactionUiWithToken[] = [];
		Object.getOwnPropertySymbols($ethTransactionsStore ?? {}).forEach((tokenId) => {
			const token = tokenById.get(tokenId as TokenId);

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
