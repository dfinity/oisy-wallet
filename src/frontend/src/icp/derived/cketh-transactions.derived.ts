import { convertEthToCkEthPendingStore } from '$icp/stores/cketh.store';
import type { IcTransactionsData } from '$icp/stores/ic-transactions.store';
import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { token } from '$lib/derived/token.derived';
import { derived, type Readable } from 'svelte/store';

export const ckEthPendingTransactions: Readable<IcTransactionsData> = derived(
	[token, convertEthToCkEthPendingStore],
	([$token, $convertEthToCkEthPendingStore]) => {
		if (!isTokenCkEthLedger($token)) {
			return [];
		}

		return ($convertEthToCkEthPendingStore?.[$token.id]?.data ?? []).map((transaction) => ({
			data: transaction,
			certified: false
		}));
	}
);
