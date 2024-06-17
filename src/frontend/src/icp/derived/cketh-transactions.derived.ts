import {
	icPendingTransactionsStore,
	type IcPendingTransactionsData
} from '$icp/stores/ic-pending-transactions.store';
import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

export const ckEthPendingTransactions: Readable<IcPendingTransactionsData> = derived(
	[tokenWithFallback, icPendingTransactionsStore],
	([$token, $convertEthToCkEthPendingStore]) => {
		if (!isTokenCkEthLedger($token) && !isTokenCkErc20Ledger($token)) {
			return [];
		}

		return $convertEthToCkEthPendingStore?.[$token.id] ?? [];
	}
);
