import {
	calculateUtxoSelection,
	estimateTransactionSize,
	extractUtxoTxIds,
	filterAvailableUtxos,
	filterLockedUtxos,
	type UtxoSelectionResult,
	utxoTxIdToString
} from '$btc/utils/btc-utxos.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Utxo } from '@dfinity/ckbtc';
import { describe, expect, it } from 'vitest';

describe('btc-utxos.utils', () => {
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
	}): Utxo => ({
		value: BigInt(value),
		height,
		outpoint: {
			txid,
			vout
		}
	});

	describe('utxoTxIdToString', () => {
		it('should convert Uint8Array to hex string', () => {
			const txid = new Uint8Array([1, 2, 3, 4]);
			const result = utxoTxIdToString(txid);

			expect(result).toBe('01020304');
		});

		it('should convert number array to hex string', () => {
			const txid = [1, 2, 3, 4];
			const result = utxoTxIdToString(txid);

			expect(result).toBe('01020304');
		});

		it('should handle empty array', () => {
			const txid = new Uint8Array([]);
			const result = utxoTxIdToString(txid);

			expect(result).toBe('');
		});
	});

	describe('extractUtxoTxIds', () => {
		it('should extract transaction IDs from UTXOs', () => {
			const utxos = [
				createMockUtxo({ value: 100_000, txid: new Uint8Array([1, 2, 3, 4]) }),
				createMockUtxo({ value: 200_000, txid: new Uint8Array([5, 6, 7, 8]) })
			];

			const result = extractUtxoTxIds(utxos);

			expect(result).toEqual(['01020304', '05060708']);
		});

		it('should return empty array for empty input', () => {
			const result = extractUtxoTxIds([]);

			expect(result).toEqual([]);
		});
	});

	describe('estimateTransactionSize', () => {
		it('should calculate transaction size correctly for multiple inputs and outputs', () => {
			const result = estimateTransactionSize({
				numInputs: 2,
				numOutputs: 2
			});

			// Base (10) + inputs (2 * 68) + outputs (2 * 31) = 10 + 136 + 62 = 208
			expect(result).toBe(208);
		});

		it('should handle single input and output', () => {
			const result = estimateTransactionSize({
				numInputs: 1,
				numOutputs: 1
			});

			// Base (10) + inputs (1 * 68) + outputs (1 * 31) = 10 + 68 + 31 = 109
			expect(result).toBe(109);
		});

		it('should handle 0n inputs and outputs', () => {
			const result = estimateTransactionSize({
				numInputs: 0,
				numOutputs: 0
			});

			// Base (10) + inputs (0 * 68) + outputs (0 * 31) = 10
			expect(result).toBe(10);
		});

		it('should handle large number of inputs and outputs', () => {
			const result = estimateTransactionSize({
				numInputs: 10,
				numOutputs: 5
			});

			// Base (10) + inputs (10 * 68) + outputs (5 * 31) = 10 + 680 + 155 = 845
			expect(result).toBe(845);
		});
	});

	describe('calculateUtxoSelection', () => {
		const utxos = [
			createMockUtxo({ value: 100_000 }),
			createMockUtxo({ value: 300_000 }),
			createMockUtxo({ value: 200_000 })
		];

		it('should select UTXOs considering transaction fees', () => {
			const result = calculateUtxoSelection({
				availableUtxos: utxos,
				amountSatoshis: 250_000n,
				feeRateSatoshisPerVByte: 10n
			});

			expect(result.selectedUtxos.length).toBeGreaterThan(0);
			expect(result.totalInputValue).toBeGreaterThan(250_000n);
			expect(result.changeAmount).toBeGreaterThanOrEqual(ZERO);
			expect(result.sufficientFunds).toBeTruthy();
			expect(result.feeSatoshis).toBeGreaterThan(ZERO);
		});

		it('should select UTXOs in descending order by value', () => {
			const result = calculateUtxoSelection({
				availableUtxos: utxos,
				amountSatoshis: 100_000n,
				feeRateSatoshisPerVByte: 1n
			});

			// Should select the largest UTXO first (300_000)
			expect(result.selectedUtxos[0].value).toBe(300_000n);
			expect(result.sufficientFunds).toBeTruthy();
			expect(result.feeSatoshis).toBeGreaterThan(ZERO);
		});

		it('should calculate correct change amount', () => {
			const result = calculateUtxoSelection({
				availableUtxos: [createMockUtxo({ value: 500_000 })],
				amountSatoshis: 100_000n,
				feeRateSatoshisPerVByte: 1n
			});

			// With 1 sat/vbyte and estimated tx size of 140 bytes, fee = 140 sats
			// Change = 500_000 - 100_000 - 140 = 399_860
			expect(result.changeAmount).toBe(399_860n);
			expect(result.sufficientFunds).toBeTruthy();
			expect(result.feeSatoshis).toBe(140n);
		});

		it('should return empty result when no UTXOs available', () => {
			const result = calculateUtxoSelection({
				availableUtxos: [],
				amountSatoshis: 100_000n,
				feeRateSatoshisPerVByte: 10n
			});

			expect(result.selectedUtxos).toHaveLength(0);
			expect(result.totalInputValue).toBe(ZERO);
			expect(result.changeAmount).toBe(ZERO);
			expect(result.sufficientFunds).toBeFalsy();
			expect(result.feeSatoshis).toBe(ZERO);
		});

		it('should return insufficient funds when not enough UTXOs', () => {
			const smallUtxos = [createMockUtxo({ value: 1000 })];

			const result = calculateUtxoSelection({
				availableUtxos: smallUtxos,
				amountSatoshis: 900n,
				feeRateSatoshisPerVByte: 100n // High fee rate will make it insufficient
			});

			expect(result.sufficientFunds).toBeFalsy();
			expect(result.feeSatoshis).toBe(ZERO);
		});

		it('should handle 0n fee rate', () => {
			const result = calculateUtxoSelection({
				availableUtxos: [createMockUtxo({ value: 100_000 })],
				amountSatoshis: 50_000n,
				feeRateSatoshisPerVByte: ZERO
			});

			expect(result.changeAmount).toBe(50_000n); // No fees
			expect(result.sufficientFunds).toBeTruthy();
			expect(result.feeSatoshis).toBe(ZERO);
		});
	});

	describe('filterLockedUtxos', () => {
		const utxos = [
			createMockUtxo({
				value: 100_000,
				txid: new Uint8Array([1, 2, 3, 4])
			}),
			createMockUtxo({
				value: 200_000,
				txid: new Uint8Array([5, 6, 7, 8])
			}),
			createMockUtxo({
				value: 300_000,
				txid: new Uint8Array([9, 10, 11, 12])
			})
		];

		it('should filter out locked UTXOs', () => {
			const pendingTxIds = ['01020304', '090a0b0c']; // Hex of [1,2,3,4] and [9,10,11,12]

			const result = filterLockedUtxos({
				utxos,
				pendingTxIds
			});

			expect(result).toHaveLength(1);
			expect(result[0].value).toBe(200_000n);
		});

		it('should return all UTXOs when no pending transactions', () => {
			const result = filterLockedUtxos({
				utxos,
				pendingTxIds: []
			});

			expect(result).toHaveLength(3);
		});

		it('should handle empty UTXO array', () => {
			const result = filterLockedUtxos({
				utxos: [],
				pendingTxIds: ['01020304']
			});

			expect(result).toEqual([]);
		});
	});

	describe('filterAvailableUtxos', () => {
		const utxos = [
			createMockUtxo({ value: 100_000, height: 0 }), // Unconfirmed
			createMockUtxo({ value: 200_000, height: 3 }), // Low confirmations
			createMockUtxo({ value: 300_000, height: 10 }), // Good
			createMockUtxo({
				value: 400_000,
				height: 15,
				txid: new Uint8Array([5, 6, 7, 8])
			}), // Good but might be locked
			createMockUtxo({
				value: 500_000,
				height: 20,
				txid: new Uint8Array([9, 10, 11, 12])
			}) // Good
		];

		it('should filter UTXOs by minimum confirmations', () => {
			const result = filterAvailableUtxos({
				utxos,
				options: {
					minConfirmations: 6,
					pendingTxIds: []
				}
			});

			expect(result).toHaveLength(3);
			expect(result.map((u) => Number(u.value))).toEqual([300_000, 400_000, 500_000]);
		});

		it('should filter out unconfirmed transactions (height 0)', () => {
			const result = filterAvailableUtxos({
				utxos,
				options: {
					minConfirmations: 1,
					pendingTxIds: []
				}
			});

			// Should exclude the unconfirmed one (height 0)
			expect(result).toHaveLength(4);
			expect(result.every((utxo) => utxo.height > 0)).toBeTruthy();
		});

		it('should filter out locked UTXOs', () => {
			const pendingTxIds = ['05060708']; // Hex of [5, 6, 7, 8]

			const result = filterAvailableUtxos({
				utxos,
				options: {
					minConfirmations: 6,
					pendingTxIds
				}
			});

			expect(result).toHaveLength(2);
			expect(result.map((u) => Number(u.value))).toEqual([300_000, 500_000]);
		});

		it('should apply both confirmation and lock filters', () => {
			const pendingTxIds = ['090a0b0c']; // Hex of [9, 10, 11, 12]

			const result = filterAvailableUtxos({
				utxos,
				options: {
					minConfirmations: 10,
					pendingTxIds
				}
			});

			// Should only have the 300_000 and 400_000 UTXOs (height >= 10, not locked)
			expect(result).toHaveLength(2);
			expect(result.map((u) => Number(u.value))).toEqual([300_000, 400_000]);
		});

		it('should handle empty UTXO array', () => {
			const result = filterAvailableUtxos({
				utxos: [],
				options: {
					minConfirmations: 1,
					pendingTxIds: []
				}
			});

			expect(result).toEqual([]);
		});
	});

	describe('calculateUtxoSelection with fees', () => {
		it('should calculate fee correctly', () => {
			const selection: UtxoSelectionResult = {
				selectedUtxos: [createMockUtxo({ value: 500_000 })],
				totalInputValue: 500_000n,
				changeAmount: 300_000n,
				sufficientFunds: true,
				feeSatoshis: 50_000n
			};
			const amountSatoshis = 150_000n;

			// Fee = totalInput - (amount + change) = 500_000 - (150_000 + 300_000) = 50_000
			const calculatedFee = selection.totalInputValue - (amountSatoshis + selection.changeAmount);

			expect(calculatedFee).toBe(50_000n);
			expect(selection.feeSatoshis).toBe(50_000n);
		});

		it('should handle ZERO change amount', () => {
			const selection: UtxoSelectionResult = {
				selectedUtxos: [createMockUtxo({ value: 200_000 })],
				totalInputValue: 200_000n,
				changeAmount: ZERO,
				sufficientFunds: true,
				feeSatoshis: 20_000n
			};
			const amountSatoshis = 180_000n;

			// Fee = 200_000 - (180_000 + 0) = 20_000
			const calculatedFee = selection.totalInputValue - (amountSatoshis + selection.changeAmount);

			expect(calculatedFee).toBe(20_000n);
			expect(selection.feeSatoshis).toBe(20_000n);
		});

		it('should handle multiple UTXOs in selection', () => {
			const selection: UtxoSelectionResult = {
				selectedUtxos: [createMockUtxo({ value: 300_000 }), createMockUtxo({ value: 200_000 })],
				totalInputValue: 500_000n,
				changeAmount: 100_000n,
				sufficientFunds: true,
				feeSatoshis: 50_000n
			};
			const amountSatoshis = 350_000n;

			// Fee = 500_000 - (350_000 + 100_000) = 50_000
			const calculatedFee = selection.totalInputValue - (amountSatoshis + selection.changeAmount);

			expect(calculatedFee).toBe(50_000n);
			expect(selection.feeSatoshis).toBe(50_000n);
		});

		it('should return ZERO when no fee is applied', () => {
			const selection: UtxoSelectionResult = {
				selectedUtxos: [createMockUtxo({ value: 100_000 })],
				totalInputValue: 100_000n,
				changeAmount: 30_000n,
				sufficientFunds: true,
				feeSatoshis: ZERO
			};
			const amountSatoshis = 70_000n;

			// Fee = 100_000 - (70_000 + 30_000) = 0
			const calculatedFee = selection.totalInputValue - (amountSatoshis + selection.changeAmount);

			expect(calculatedFee).toBe(ZERO);
			expect(selection.feeSatoshis).toBe(ZERO);
		});
	});
});
