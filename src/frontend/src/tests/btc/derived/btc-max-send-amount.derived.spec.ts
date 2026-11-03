import { initBtcMaxSendAmount } from '$btc/derived/btc-max-send-amount.derived';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { calculateFeeSatoshis } from '$btc/utils/btc-utxos.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { get } from 'svelte/store';

describe('initBtcMaxSendAmount', () => {
	const mockAddress = 'bitcoin-address';
	const feeRateMiliSatoshisPerVByte = 1_000n;

	const createMockUtxo = ({
		value,
		height = 10,
		txid = new Uint8Array([1, 2, 3, 4]),
		vout = 0
	}: {
		value: number;
		height?: number;
		txid?: Uint8Array;
		vout?: number;
	}): CkBtcMinterDid.Utxo => ({
		value: BigInt(value),
		height,
		outpoint: { txid, vout }
	});

	const setPendingTransactions = (utxos: CkBtcMinterDid.Utxo[] = []) => {
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: mockAddress,
			pendingTransactions: utxos.length === 0 ? [] : [{ txid: new Uint8Array([9]), utxos }]
		});
	};

	beforeEach(() => {
		allUtxosStore.reset();
		btcPendingSentTransactionsStore.reset();
		feeRatePercentilesStore.reset();
	});

	it('should be undefined until the UTXOs are loaded', () => {
		setPendingTransactions();
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1_000n });

		expect(get(initBtcMaxSendAmount(mockAddress))).toBeUndefined();
	});

	it('should be undefined until the fee rate is loaded', () => {
		allUtxosStore.setAllUtxos({ allUtxos: [createMockUtxo({ value: 100_000 })] });
		setPendingTransactions();

		expect(get(initBtcMaxSendAmount(mockAddress))).toBeUndefined();
	});

	it('should be undefined until the pending transactions of the address are known', () => {
		allUtxosStore.setAllUtxos({ allUtxos: [createMockUtxo({ value: 100_000 })] });
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1_000n });

		expect(get(initBtcMaxSendAmount(mockAddress))).toBeUndefined();
	});

	it('should cap Max at the spendable UTXOs minus the fee for spending all of them', () => {
		allUtxosStore.setAllUtxos({
			allUtxos: [
				createMockUtxo({ value: 100_000 }),
				createMockUtxo({ value: 200_000, txid: new Uint8Array([5, 6, 7, 8]) })
			]
		});
		setPendingTransactions();
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1_000n });

		expect(get(initBtcMaxSendAmount(mockAddress))).toBe(
			300_000n - calculateFeeSatoshis({ numInputs: 2, feeRateMiliSatoshisPerVByte })
		);
	});

	// Regression: incoming funds under the send's confirmation floor counted towards the balance
	// the "Max" button offered, so clicking it produced "Insufficient balance to cover the fees".
	it('should ignore incoming UTXOs that are still under the confirmation floor', () => {
		allUtxosStore.setAllUtxos({
			allUtxos: [
				createMockUtxo({ value: 1_000, height: 10 }),
				createMockUtxo({ value: 40_000, height: 3, txid: new Uint8Array([5, 6, 7, 8]) })
			]
		});
		setPendingTransactions();
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1_000n });

		expect(get(initBtcMaxSendAmount(mockAddress))).toBe(
			1_000n - calculateFeeSatoshis({ numInputs: 1, feeRateMiliSatoshisPerVByte })
		);
	});

	it('should ignore UTXOs a pending send has already reserved', () => {
		const reserved = createMockUtxo({ value: 200_000, txid: new Uint8Array([5, 6, 7, 8]) });

		allUtxosStore.setAllUtxos({
			allUtxos: [createMockUtxo({ value: 100_000 }), reserved]
		});
		setPendingTransactions([reserved]);
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1_000n });

		expect(get(initBtcMaxSendAmount(mockAddress))).toBe(
			100_000n - calculateFeeSatoshis({ numInputs: 1, feeRateMiliSatoshisPerVByte })
		);
	});

	it('should be zero when no UTXO is spendable', () => {
		allUtxosStore.setAllUtxos({ allUtxos: [createMockUtxo({ value: 40_000, height: 3 })] });
		setPendingTransactions();
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1_000n });

		expect(get(initBtcMaxSendAmount(mockAddress))).toBe(ZERO);
	});
});
