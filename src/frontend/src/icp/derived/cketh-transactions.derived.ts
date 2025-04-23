import {
	icPendingTransactionsStore,
	type IcPendingTransactionsData
} from '$icp/stores/ic-pending-transactions.store';
import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const ckEthPendingTransactions: Readable<(token?: Token) => IcPendingTransactionsData> =
	derived(
		[tokenWithFallback, icPendingTransactionsStore],
		([$token, $convertEthToCkEthPendingStore]) =>
			(token?: Token) => {
				// remove fallback when $token gets removed
				if (nonNullish(token)) {
					$token = token;
				}

				if (!isTokenCkEthLedger($token) && !isTokenCkErc20Ledger($token)) {
					return [];
				}

				return $convertEthToCkEthPendingStore?.[$token.id] ?? [];
			}
	);
