import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
import { ckEthPendingTransactions } from '$icp/derived/cketh-transactions.derived';
import { btcStatusesStore } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { icTransactionsStore, type IcTransactionsData } from '$icp/stores/ic-transactions.store';
import { getAllIcTransactions, getIcExtendedTransactions } from '$icp/utils/ic-transactions.utils';
import { isTokenIcp } from '$icp/utils/icrc.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { TokenId } from '$lib/types/token';
import type { AnyTransactionUiWithToken } from '$lib/types/transaction';
import type { KnownDestinations } from '$lib/types/transactions';
import { getKnownDestinations } from '$lib/utils/transactions.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

const icExtendedTransactions: Readable<NonNullable<IcTransactionsData>> = derived(
	[tokenWithFallback, icTransactionsStore, btcStatusesStore],
	([$token, $icTransactionsStore, $btcStatusesStore]) =>
		getIcExtendedTransactions({
			token: $token,
			icTransactionsStore: $icTransactionsStore,
			btcStatusesStore: $btcStatusesStore
		})
);

export const icTransactions: Readable<NonNullable<IcTransactionsData>> = derived(
	[
		tokenWithFallback,
		ckBtcPendingUtxoTransactions,
		ckEthPendingTransactions,
		icExtendedTransactions,
		btcStatusesStore,
		ckBtcMinterInfoStore,
		ckBtcPendingUtxosStore,
		icPendingTransactionsStore,
		icTransactionsStore
	],
	([
		$token,
		$ckBtcPendingUtxoTransactions,
		$ckEthPendingTransactions,
		$icExtendedTransactions,
		$btcStatusesStore,
		$ckBtcMinterInfoStore,
		$ckBtcPendingUtxosStore,
		$icPendingTransactionsStore,
		$icTransactionsStore
	]) =>
		getAllIcTransactions({
			token: $token,
			ckBtcPendingUtxoTransactions: $ckBtcPendingUtxoTransactions,
			ckBtcPendingUtxosStore: $ckBtcPendingUtxosStore,
			ckEthPendingTransactions: $ckEthPendingTransactions,
			ckBtcMinterInfoStore: $ckBtcMinterInfoStore,
			btcStatusesStore: $btcStatusesStore,
			icPendingTransactionsStore: $icPendingTransactionsStore,
			icExtendedTransactions: $icExtendedTransactions,
			icTransactionsStore: $icTransactionsStore
		})
);

export const icKnownDestinations: Readable<KnownDestinations> = derived(
	[icTransactionsStore, tokens, tokenWithFallback],
	([$icTransactionsStore, $tokens, $tokenWithFallback]) => {
		const isIcpToken = isTokenIcp($tokenWithFallback);
		const { [ICP_TOKEN_ID]: icpTransactions, ...icCkTransactionsStore } =
			$icTransactionsStore ?? {};
		const icpTransactionsStore = { [ICP_TOKEN_ID]: icpTransactions ?? [] };

		const mappedTransactions: AnyTransactionUiWithToken[] = [];

		Object.getOwnPropertySymbols(isIcpToken ? icpTransactionsStore : icCkTransactionsStore).forEach(
			(tokenId) => {
				const token = $tokens.find(({ id }) => id === tokenId);

				if (nonNullish(token)) {
					($icTransactionsStore?.[tokenId as TokenId] ?? []).forEach(({ data }) => {
						mappedTransactions.push({
							...data,
							token
						});
					});
				}
			}
		);

		return getKnownDestinations(mappedTransactions);
	}
);
