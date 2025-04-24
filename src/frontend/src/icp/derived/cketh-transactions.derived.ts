import {
	icPendingTransactionsStore,
	type IcPendingTransactionsData
} from '$icp/stores/ic-pending-transactions.store';
import { getCkEthPendingTransactions } from '$icp/utils/cketh-transactions.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

export const ckEthPendingTransactions: Readable<IcPendingTransactionsData> = derived(
	[tokenWithFallback, icPendingTransactionsStore],
	([$token, $convertEthToCkEthPendingStore]) =>
		getCkEthPendingTransactions({
			token: $token,
			icPendingTransactionsStore: $convertEthToCkEthPendingStore
		})
);
