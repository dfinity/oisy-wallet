import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
import { ckEthPendingTransactions } from '$icp/derived/cketh-transactions.derived';
import { btcStatusesStore } from '$icp/stores/btc.store';
import { icTransactionsStore, type IcTransactionsData } from '$icp/stores/ic-transactions.store';
import { extendIcTransaction } from '$icp/utils/ic-transactions.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

const icExtendedTransactions: Readable<(token?: Token) => NonNullable<IcTransactionsData>> =
	derived(
		[tokenWithFallback, icTransactionsStore, btcStatusesStore],
		([$token, $icTransactionsStore, $btcStatusesStore]) =>
			(token?: Token) =>
				($icTransactionsStore?.[nonNullish(token) ? token?.id : $token.id] ?? []).map(
					(transaction) =>
						extendIcTransaction({
							transaction,
							token: $token,
							btcStatuses: $btcStatusesStore?.[$token.id] ?? undefined
						})
				)
	);

export const icTransactions: Readable<(token?: Token) => NonNullable<IcTransactionsData>> = derived(
	[ckBtcPendingUtxoTransactions, ckEthPendingTransactions, icExtendedTransactions],
	([$ckBtcPendingUtxoTransactions, $ckEthPendingTransactions, $icExtendedTransactions]) =>
		(token?: Token) => [
			...$ckBtcPendingUtxoTransactions(token),
			...$ckEthPendingTransactions(token),
			...$icExtendedTransactions(token)
		]
);
