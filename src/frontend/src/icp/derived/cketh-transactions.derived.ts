import {
	convertEthToCkEthPendingStore,
	type ConvertEthToCkEthPendingTransactionsData
} from '$icp/stores/cketh-transactions.store';
import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { token } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

export const ckEthPendingTransactions: Readable<ConvertEthToCkEthPendingTransactionsData> = derived(
	[token, convertEthToCkEthPendingStore],
	([$token, $convertEthToCkEthPendingStore]) => {
		if (!isTokenCkEthLedger($token)) {
			return [];
		}

		return $convertEthToCkEthPendingStore?.[$token.id] ?? [];
	}
);
