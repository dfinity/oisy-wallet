import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcTransactionsData } from '$icp/stores/ic-transactions.store';
import type { IcCkToken } from '$icp/types/ic';
import { mapCkBTCPendingUtxo } from '$icp/utils/ckbtc-transactions.utils';
import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
import { tokenWithFallback } from '$lib/derived/token.derived';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

// I would rather like to move mapping those pending utxos to a web worker but the dependency on the minter info is conceptually annoying as it would lead to developping even more custom code for ckBTC which already required way to many mumbo jumbo.
export const ckBtcPendingUtxoTransactions: Readable<NonNullable<IcTransactionsData>> = derived(
	[tokenWithFallback, ckBtcMinterInfoStore, ckBtcPendingUtxosStore],
	([$token, $ckBtcMinterInfoStore, $ckBtcPendingUtxosStore]) => {
		if (!isTokenCkBtcLedger($token)) {
			return [];
		}

		const kytFee = $ckBtcMinterInfoStore?.[$token.id]?.data.kyt_fee;

		if (isNullish(kytFee)) {
			return [];
		}

		return ($ckBtcPendingUtxosStore?.[$token.id]?.data ?? []).map((utxo) => ({
			data: mapCkBTCPendingUtxo({
				utxo,
				kytFee,
				ledgerCanisterId: ($token as IcCkToken).ledgerCanisterId
			}),
			certified: false
		}));
	}
);
