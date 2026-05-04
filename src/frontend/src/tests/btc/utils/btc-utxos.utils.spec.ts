import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import {
	calculateUtxoSelection,
	estimateTransactionSize,
	extractUtxoTxIds,
	filterAvailableUtxos,
	filterLockedUtxos,
	resetUtxosDataStores,
	type UtxoSelectionResult
} from '$btc/utils/btc-utxos.utils';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { get } from 'svelte/store';

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
	}): CkBtcMinterDid.Utxo => ({
		value: BigInt(value),
		height,
		outpoint: {
			txid,
			vout
		}
	});

	describe('utxoTxIdToString', () => {
		it('should convert Uint8Array to hex string with byte reversal', () => {
			const txid = new Uint8Array([1, 2, 3, 4]);
			const result = utxoTxIdToString(txid);

			expect(result).toBe('04030201');
		});

		it('should convert number array to hex string with byte reversal', () => {
			const txid = Uint8Array.from([1, 2, 3, 4]);
			const result = utxoTxIdToString(txid);

			expect(result).toBe('04030201');
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

			expect(result).toEqual(['04030201', '08070605']);
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

			// Base (11) + inputs (2 * 68) + outputs (2 * 31) = 11 + 136 + 62 = 209
			expect(result).toBe(209);
		});

		it('should handle single input and output', () => {
			const result = estimateTransactionSize({
				numInputs: 1,
				numOutputs: 1
			});

			// Base (11) + inputs (1 * 68) + outputs (1 * 31) = 11 + 68 + 31 = 110
			expect(result).toBe(110);
		});

		it('should handle 0n inputs and outputs', () => {
			const result = estimateTransactionSize({
				numInputs: 0,
				numOutputs: 0
			});

			// Base (11) + inputs (0 * 68) + outputs (0 * 31) = 11
			expect(result).toBe(11);
		});

		it('should handle large number of inputs and outputs', () => {
			const result = estimateTransactionSize({
				numInputs: 10,
				numOutputs: 5
			});

			// Base (11) + inputs (10 * 68) + outputs (5 * 31) = 11 + 680 + 155 = 846
			expect(result).toBe(846);
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
				feeRateMiliSatoshisPerVByte: 10000n
			});

			expect(result.selectedUtxos.length).toBeGreaterThan(0);
			expect(result.totalInputValue).toBeGreaterThan(250_000n);
			expect(result.changeAmount).toBeGreaterThanOrEqual(ZERO);
			expect(result.sufficientFunds).toBeTruthy();
			expect(result.feeSatoshis).toBeGreaterThan(ZERO);
		});

		it('should select the smallest UTXO that covers amount + fee', () => {
			const result = calculateUtxoSelection({
				availableUtxos: utxos,
				amountSatoshis: 100_000n,
				feeRateMiliSatoshisPerVByte: 1000n
			});

			// fee(1 input) = 141 sats; needed = 100_141. Candidates >= 100_141: 200_000 and 300_000.
			// Smallest sufficient is 200_000.
			expect(result.selectedUtxos).toHaveLength(1);
			expect(result.selectedUtxos[0].value).toBe(200_000n);
			expect(result.sufficientFunds).toBeTruthy();
			expect(result.feeSatoshis).toBeGreaterThan(ZERO);
		});

		it('should calculate correct change amount', () => {
			const result = calculateUtxoSelection({
				availableUtxos: [createMockUtxo({ value: 500_000 })],
				amountSatoshis: 100_000n,
				feeRateMiliSatoshisPerVByte: 1000n
			});

			// With 1 sat/vbyte and estimated tx size of 141 bytes, fee = 141 sats
			// Change = 500_000 - 100_000 - 141 = 399_859
			expect(result.changeAmount).toBe(399_859n);
			expect(result.sufficientFunds).toBeTruthy();
			expect(result.feeSatoshis).toBe(141n);
		});

		it('should return empty result when no UTXOs available', () => {
			const result = calculateUtxoSelection({
				availableUtxos: [],
				amountSatoshis: 100_000n,
				feeRateMiliSatoshisPerVByte: 10000n
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
				feeRateMiliSatoshisPerVByte: 100000n // High fee rate will make it insufficient
			});

			expect(result.sufficientFunds).toBeFalsy();
			expect(result.feeSatoshis).toBeGreaterThan(ZERO); // Should have calculated fee even when insufficient
			// With 1 input and 2 outputs, tx size = 11 + 1*68 + 2*31 = 141 bytes
			// Fee = 141 * 100 = 14100 satoshis
			expect(result.feeSatoshis).toBe(14100n);
		});

		it('should handle 0n fee rate', () => {
			const result = calculateUtxoSelection({
				availableUtxos: [createMockUtxo({ value: 100_000 })],
				amountSatoshis: 50_000n,
				feeRateMiliSatoshisPerVByte: ZERO
			});

			expect(result.changeAmount).toBe(50_000n); // No fees
			expect(result.sufficientFunds).toBeTruthy();
			expect(result.feeSatoshis).toBe(ZERO);
		});
	});

	describe('calculateUtxoSelection — algorithm scenarios', () => {
		// Fee reference at feeRateMiliSatoshisPerVByte = 1000n (1 sat/vbyte):
		//   1 input : 11 + 1×68 + 2×31 = 141 sats
		//   2 inputs: 11 + 2×68 + 2×31 = 209 sats
		//   3 inputs: 11 + 3×68 + 2×31 = 277 sats

		const FEE_RATE = 1000n;
		const FEE_1_INPUT = 141n;
		const FEE_2_INPUTS = 209n;
		const FEE_3_INPUTS = 277n;

		describe('single-input selection', () => {
			it('picks the smallest UTXO that alone covers amount + fee when several candidates qualify', () => {
				// Mirrors user example: [4,2,6,40,8,12,43] → send 10 → pick 12
				const utxos = [
					createMockUtxo({ value: 400_000 }),
					createMockUtxo({ value: 200_000 }),
					createMockUtxo({ value: 600_000 }),
					createMockUtxo({ value: 4_000_000 }),
					createMockUtxo({ value: 800_000 }),
					createMockUtxo({ value: 1_200_000 }),
					createMockUtxo({ value: 4_300_000 })
				];

				// needed = 1_000_000 + 141 = 1_000_141
				// Candidates ≥ 1_000_141: 1_200_000, 4_000_000, 4_300_000 → pick 1_200_000
				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 1_000_000n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.selectedUtxos).toHaveLength(1);
				expect(result.selectedUtxos[0].value).toBe(1_200_000n);
				expect(result.feeSatoshis).toBe(FEE_1_INPUT);
				expect(result.changeAmount).toBe(1_200_000n - 1_000_000n - FEE_1_INPUT);
				expect(result.sufficientFunds).toBeTruthy();
			});

			it('picks the UTXO that exactly covers amount + fee (zero change)', () => {
				// 100_000 + 141 = 100_141 → UTXO of exactly 100_141 should be selected
				const utxos = [
					createMockUtxo({ value: 200_000 }),
					createMockUtxo({ value: 100_141 }),
					createMockUtxo({ value: 500_000 })
				];

				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 100_000n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.selectedUtxos).toHaveLength(1);
				expect(result.selectedUtxos[0].value).toBe(100_141n);
				expect(result.changeAmount).toBe(ZERO);
				expect(result.feeSatoshis).toBe(FEE_1_INPUT);
				expect(result.sufficientFunds).toBeTruthy();
			});

			it('is insufficient when the only UTXO is 1 sat below amount + fee', () => {
				// 100_000 + 141 = 100_141; UTXO = 100_140 → cannot satisfy
				const result = calculateUtxoSelection({
					availableUtxos: [createMockUtxo({ value: 100_140 })],
					amountSatoshis: 100_000n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.sufficientFunds).toBeFalsy();
				expect(result.changeAmount).toBe(ZERO);
			});
		});

		describe('two-input selection (restart after picking largest)', () => {
			it('picks smallest sufficient UTXO on the second pass, not the next-largest', () => {
				// Mirrors user example: [3,7,2,6,1] → send 10 → pick [7, 3] not [7, 6]
				// Scaled: send 999_791 so that amount + fee(2) = 1_000_000 exactly
				const utxos = [
					createMockUtxo({ value: 300_000 }),
					createMockUtxo({ value: 700_000 }),
					createMockUtxo({ value: 200_000 }),
					createMockUtxo({ value: 600_000 }),
					createMockUtxo({ value: 100_000 })
				];

				// Pass 1: needed = 999_791 + 141 = 999_932 → no single UTXO qualifies → pick largest (700_000)
				// Pass 2: needed = 999_791 + 209 − 700_000 = 300_000 → candidates ≥ 300_000: {300_000, 600_000} → pick 300_000
				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 999_791n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.selectedUtxos).toHaveLength(2);
				expect(result.selectedUtxos[0].value).toBe(700_000n);
				expect(result.selectedUtxos[1].value).toBe(300_000n);
				expect(result.feeSatoshis).toBe(FEE_2_INPUTS);
				expect(result.changeAmount).toBe(ZERO);
				expect(result.sufficientFunds).toBeTruthy();
			});

			it('produces less change than a largest-first approach would', () => {
				// [700k, 600k, 300k] → amount chosen so largest-first would pick [700k, 600k]
				// but smallest-sufficient restart gives [700k, 300k]
				const utxos = [
					createMockUtxo({ value: 700_000 }),
					createMockUtxo({ value: 600_000 }),
					createMockUtxo({ value: 300_000 })
				];

				// Pass 1: needed = 999_791 + 141 = 999_932 → no UTXO qualifies → pick 700_000
				// Pass 2: needed = 999_791 + 209 − 700_000 = 300_000 → pick 300_000 (not 600_000)
				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 999_791n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.selectedUtxos).toHaveLength(2);
				expect(result.selectedUtxos[1].value).toBe(300_000n); // smallest sufficient, not 600_000
				expect(result.changeAmount).toBe(ZERO);
				expect(result.sufficientFunds).toBeTruthy();
			});
		});

		describe('three-input selection', () => {
			it('restarts the smallest-sufficient search after each largest-UTXO pick', () => {
				const utxos = [
					createMockUtxo({ value: 400_000 }),
					createMockUtxo({ value: 350_000 }),
					createMockUtxo({ value: 300_000 }),
					createMockUtxo({ value: 200_000 }),
					createMockUtxo({ value: 100_000 })
				];

				// Pass 1: needed = 900_000 + 141 = 900_141 → no UTXO qualifies → pick 400_000
				// Pass 2: needed = 900_000 + 209 − 400_000 = 500_209 → no UTXO qualifies → pick 350_000
				// Pass 3: needed = 900_000 + 277 − 750_000 = 150_277 → candidates ≥ 150_277: {300_000, 200_000} → pick 200_000
				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 900_000n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.selectedUtxos).toHaveLength(3);
				expect(result.selectedUtxos[0].value).toBe(400_000n);
				expect(result.selectedUtxos[1].value).toBe(350_000n);
				expect(result.selectedUtxos[2].value).toBe(200_000n); // not 300_000
				expect(result.feeSatoshis).toBe(FEE_3_INPUTS);
				expect(result.changeAmount).toBe(950_000n - 900_000n - FEE_3_INPUTS); // 49_723
				expect(result.sufficientFunds).toBeTruthy();
			});
		});

		describe('fee grows with each additional input', () => {
			it('accounts for the higher fee when a second input is required', () => {
				// Single UTXO of 600_000 is enough for amount 500_000 + fee(1) = 500_141.
				// But here the largest UTXO is 300_000 which is below the needed 500_141,
				// forcing a second pick — at which point fee(2) = 209 applies.
				const utxos = [createMockUtxo({ value: 300_000 }), createMockUtxo({ value: 250_000 })];

				// Pass 1: needed = 500_000 + 141 = 500_141 → no UTXO qualifies → pick 300_000
				// Pass 2: needed = 500_000 + 209 − 300_000 = 200_209 → 250_000 ≥ 200_209 → pick 250_000
				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 500_000n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.selectedUtxos).toHaveLength(2);
				expect(result.feeSatoshis).toBe(FEE_2_INPUTS);
				expect(result.changeAmount).toBe(550_000n - 500_000n - FEE_2_INPUTS); // 49_791
				expect(result.sufficientFunds).toBeTruthy();
			});
		});

		describe('UTXOs with equal values', () => {
			it('selects one UTXO when any single one covers amount + fee', () => {
				const utxos = [
					createMockUtxo({ value: 500_000, vout: 0 }),
					createMockUtxo({ value: 500_000, vout: 1 }),
					createMockUtxo({ value: 500_000, vout: 2 })
				];

				// needed = 450_000 + 141 = 450_141 → 500_000 qualifies → pick one
				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 450_000n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.selectedUtxos).toHaveLength(1);
				expect(result.selectedUtxos[0].value).toBe(500_000n);
				expect(result.sufficientFunds).toBeTruthy();
			});
		});

		describe('insufficient funds', () => {
			it('returns all available UTXOs when total is still not enough', () => {
				const utxos = [createMockUtxo({ value: 100_000 }), createMockUtxo({ value: 50_000 })];

				// 100_000 + 50_000 = 150_000 < 200_000 + 141
				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 200_000n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.sufficientFunds).toBeFalsy();
				expect(result.selectedUtxos).toHaveLength(2);
				expect(result.changeAmount).toBe(ZERO);
			});

			it('is insufficient when the total exactly covers amount but not amount + fee', () => {
				// total = 200_000, amount = 200_000, fee(2) = 209 → 200_000 < 200_209
				const utxos = [
					createMockUtxo({ value: 100_000 }),
					createMockUtxo({ value: 100_000, vout: 1 })
				];

				const result = calculateUtxoSelection({
					availableUtxos: utxos,
					amountSatoshis: 200_000n,
					feeRateMiliSatoshisPerVByte: FEE_RATE
				});

				expect(result.sufficientFunds).toBeFalsy();
			});
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
			const pendingUtxoTxIds = ['04030201', '0c0b0a09']; // Hex of [1,2,3,4] and [9,10,11,12] reversed

			const result = filterLockedUtxos({
				utxos,
				pendingUtxoTxIds
			});

			expect(result).toHaveLength(1);
			expect(result[0].value).toBe(200_000n);
		});

		it('should return all UTXOs when no pending transactions', () => {
			const result = filterLockedUtxos({
				utxos,
				pendingUtxoTxIds: []
			});

			expect(result).toHaveLength(3);
		});

		it('should handle empty UTXO array', () => {
			const result = filterLockedUtxos({
				utxos: [],
				pendingUtxoTxIds: ['04030201']
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
					pendingUtxoTxIds: []
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
					pendingUtxoTxIds: []
				}
			});

			// Should exclude the unconfirmed one (height 0)
			expect(result).toHaveLength(4);
			expect(result.every((utxo) => utxo.height > 0)).toBeTruthy();
		});

		it('should filter out locked UTXOs', () => {
			const pendingUtxoTxIds = ['08070605']; // Hex of [5, 6, 7, 8] reversed

			const result = filterAvailableUtxos({
				utxos,
				options: {
					minConfirmations: 6,
					pendingUtxoTxIds
				}
			});

			expect(result).toHaveLength(2);
			expect(result.map((u) => Number(u.value))).toEqual([300_000, 500_000]);
		});

		it('should apply both confirmation and lock filters', () => {
			const pendingUtxoTxIds = ['0c0b0a09']; // Hex of [9, 10, 11, 12] reversed

			const result = filterAvailableUtxos({
				utxos,
				options: {
					minConfirmations: 10,
					pendingUtxoTxIds
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
					pendingUtxoTxIds: []
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

	describe('resetUtxosDataStores', () => {
		beforeEach(() => {
			allUtxosStore.reset();
			feeRatePercentilesStore.reset();
			btcPendingSentTransactionsStore.reset();
		});

		it('should reset all UTXO-related stores', () => {
			allUtxosStore.setAllUtxos({
				allUtxos: [createMockUtxo({ value: 100_000 })]
			});
			feeRatePercentilesStore.setFeeRateFromPercentiles({
				feeRateFromPercentiles: 5000n
			});
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: 'test-address',
				pendingTransactions: []
			});

			expect(get(allUtxosStore)?.allUtxos).toBeDefined();
			expect(get(feeRatePercentilesStore)?.feeRateFromPercentiles).toBeDefined();
			expect(get(btcPendingSentTransactionsStore)['test-address']).toBeDefined();

			resetUtxosDataStores();

			expect(get(allUtxosStore)).toBeNull();
			expect(get(feeRatePercentilesStore)).toBeNull();
			expect(get(btcPendingSentTransactionsStore)).toEqual({});
		});
	});
});
