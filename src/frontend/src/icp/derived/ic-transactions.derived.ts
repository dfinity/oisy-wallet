import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
import { ckEthPendingTransactions } from '$icp/derived/cketh-transactions.derived';
import { btcStatusesStore } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { icTransactionsStore, type IcTransactionsData } from '$icp/stores/ic-transactions.store';
import { getAllIcTransactions, getIcExtendedTransactions } from '$icp/utils/ic-transactions.utils';
import { authIdentity } from '$lib/derived/auth.derived';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { KnownDestinations } from '$lib/types/transactions';
import { getIcKnownDestinations } from '$lib/utils/transactions.utils';
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
	[icTransactionsStore, tokens, tokenWithFallback, authIdentity],
	([$icTransactionsStore, $tokens, $tokenWithFallback, $authIdentity]) =>
		getIcKnownDestinations({
			transactions: $icTransactionsStore,
			tokens: $tokens,
			token: $tokenWithFallback,
			identity: $authIdentity
		})
);
