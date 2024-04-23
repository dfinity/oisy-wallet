import {
	icPendingTransactionsStore,
	type IcPendingTransactionsData
} from '$icp/stores/ic-pending-transactions.store';
import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { token } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

export const ckEthPendingTransactions: Readable<IcPendingTransactionsData> = derived(
	[token, icPendingTransactionsStore],
	([$token, $convertEthToCkEthPendingStore]) => {
		if (!isTokenCkEthLedger($token)) {
			return [];
		}

		return $convertEthToCkEthPendingStore?.[$token.id] ?? [];
	}
);
