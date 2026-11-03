import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { calculateMaxSpendableAmount } from '$btc/utils/btc-utxos.utils';
import { getPendingTransactionUtxoOutpoints } from '$icp/utils/btc.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The cap "Max" must respect for a BTC source address, in satoshis.
 *
 * The wallet balance is not that cap: it is read at `BTC_BALANCE_MIN_CONFIRMATIONS` and so
 * includes incoming UTXOs a send cannot select yet, as well as any funds a pending send has
 * already reserved. This reads the same three stores `UtxosFeeLoader` prices the fee from, so
 * the offered amount and the selection that has to honour it agree by construction.
 *
 * `undefined` until all three are loaded — the caller then keeps its own default rather than
 * showing a cap computed from a set we do not have yet.
 */
export const initBtcMaxSendAmount = (source: string): Readable<bigint | undefined> =>
	derived(
		[allUtxosStore, btcPendingSentTransactionsStore, feeRatePercentilesStore],
		([$allUtxosStore, $btcPendingSentTransactionsStore, $feeRatePercentilesStore]) => {
			const utxos = $allUtxosStore?.allUtxos;
			const feeRateMiliSatoshisPerVByte = $feeRatePercentilesStore?.feeRateFromPercentiles;

			// Subscribed to above so the cap recomputes when a send reserves new UTXOs; the
			// outpoint extraction itself stays in the shared helper.
			const pendingUtxoOutpoints = nonNullish($btcPendingSentTransactionsStore[source])
				? getPendingTransactionUtxoOutpoints(source)
				: null;

			if (
				isNullish(utxos) ||
				isNullish(feeRateMiliSatoshisPerVByte) ||
				isNullish(pendingUtxoOutpoints)
			) {
				return undefined;
			}

			return calculateMaxSpendableAmount({
				utxos,
				pendingUtxoOutpoints,
				feeRateMiliSatoshisPerVByte
			});
		}
	);
