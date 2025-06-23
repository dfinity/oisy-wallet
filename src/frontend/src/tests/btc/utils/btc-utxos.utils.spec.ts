import {
	estimateTransactionSize,
	filterLockedUtxos,
	filterUtxos,
	getAllUtxosPaginated,
	getUtxos,
	selectUtxos,
	selectUtxosWithFee
} from '$btc/utils/btc-utxos.utils';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import type { OptionIdentity } from '$lib/types/identity';
import type { BitcoinNetwork, Utxo, get_utxos_response } from '@dfinity/ckbtc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the bitcoin API
vi.mock('$icp/api/bitcoin.api');

// Mock environment
vi.mock('$env/networks/networks.icrc.env', () => ({
	BITCOIN_CANISTER_IDS: {
		'test-minter-id': 'test-bitcoin-canister-id'
	}
}));

describe('btc-utxos.utils', () => {
	const mockIdentity = {} as OptionIdentity;
	const mockAddress = 'bc1qtest123';
	const mockNetwork: BitcoinNetwork = 'mainnet';
	const mockMinterCanisterId = 'test-minter-id';

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

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getUtxos', () => {
		it('should fetch UTXOs successfully', async () => {
			const mockUtxos = [createMockUtxo({ value: 100_000 })];
			const mockResponse: get_utxos_response = {
				utxos: mockUtxos,
				tip_height: 800_000,
				tip_block_hash: new Uint8Array(),
				next_page: []
			};

			vi.mocked(bitcoinApi.getUtxosQuery).mockResolvedValue(mockResponse);

			const result = await getUtxos({
				identity: mockIdentity,
				address: mockAddress,
				network: mockNetwork,
				minterCanisterId: mockMinterCanisterId
			});

			expect(result).toEqual(mockUtxos);
			expect(bitcoinApi.getUtxosQuery).toHaveBeenCalledWith({
				identity: mockIdentity,
				address: mockAddress,
				network: mockNetwork,
				bitcoinCanisterId: 'test-bitcoin-canister-id'
			});
		});

		it('should throw error when identity is null', async () => {
			await expect(
				getUtxos({
					identity: null,
					address: mockAddress,
					network: mockNetwork,
					minterCanisterId: mockMinterCanisterId
				})
			).rejects.toThrow();
		});

		it('should throw error when bitcoin canister ID is not found', async () => {
			await expect(
				getUtxos({
					identity: mockIdentity,
					address: mockAddress,
					network: mockNetwork,
					minterCanisterId: 'unknown-minter-id'
				})
			).rejects.toThrow('No Bitcoin canister ID found for minter: unknown-minter-id');
		});
	});

	describe('filterUtxos', () => {
		const utxos = [
			createMockUtxo({ value: 100_000, height: 0 }), // Unconfirmed
			createMockUtxo({ value: 200_000, height: 3 }), // Low confirmations
			createMockUtxo({ value: 300_000, height: 10 }), // Good
			createMockUtxo({
				value: 400_000,
				height: 15,
				txid: new Uint8Array([5, 6, 7, 8])
			}) // Good but will be excluded
		];

		it('should filter UTXOs by minimum confirmations', () => {
			const result = filterUtxos({
				utxos,
				options: { minConfirmations: 6 }
			});

			expect(result).toHaveLength(2);
			expect(result[0].value).toBe(300_000n);
			expect(result[1].value).toBe(400_000n);
		});

		it('should filter out excluded transaction IDs', () => {
			const excludeTxIds = ['05060708']; // Hex of [5, 6, 7, 8]

			const result = filterUtxos({
				utxos,
				options: {
					minConfirmations: 6,
					excludeTxIds
				}
			});

			expect(result).toHaveLength(1);
			expect(result[0].value).toBe(300_000n);
		});

		it('should use default options when none provided', () => {
			const result = filterUtxos({ utxos });

			// With default minConfirmations=6, should get 2 UTXOs
			expect(result).toHaveLength(2);
		});
	});

	describe('selectUtxos', () => {
		const utxos = [
			createMockUtxo({ value: 100_000 }),
			createMockUtxo({ value: 300_000 }),
			createMockUtxo({ value: 200_000 })
		];

		it('should select UTXOs to cover the required amount', () => {
			const result = selectUtxos({
				availableUtxos: utxos,
				amountSatoshis: 400_000n
			});

			expect(result.selectedUtxos).toHaveLength(2);
			expect(result.totalInputValue).toBe(500_000n); // 300_000 + 200_000
			expect(result.changeAmount).toBe(100_000n); // 500_000 - 400_000
		});

		it('should throw error when no UTXOs available', () => {
			expect(() =>
				selectUtxos({
					availableUtxos: [],
					amountSatoshis: 100_000n
				})
			).toThrow('No UTXOs available for selection');
		});

		it('should throw error when insufficient funds', () => {
			expect(() =>
				selectUtxos({
					availableUtxos: utxos,
					amountSatoshis: 700_000n // More than total available
				})
			).toThrow('Insufficient funds');
		});

		it('should select UTXOs in descending order by value', () => {
			const result = selectUtxos({
				availableUtxos: utxos,
				amountSatoshis: 250_000n
			});

			// Should select the largest UTXO first (300_000)
			expect(result.selectedUtxos).toHaveLength(1);
			expect(result.selectedUtxos[0].value).toBe(300_000n);
		});
	});

	describe('estimateTransactionSize', () => {
		it('should calculate transaction size correctly', () => {
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
	});

	describe('selectUtxosWithFee', () => {
		const utxos = [
			createMockUtxo({ value: 100_000 }),
			createMockUtxo({ value: 300_000 }),
			createMockUtxo({ value: 200_000 })
		];

		it('should select UTXOs considering transaction fees', () => {
			const result = selectUtxosWithFee({
				availableUtxos: utxos,
				amountSatoshis: 250_000n,
				feeRateSatoshisPerByte: 10n
			});

			expect(result.selectedUtxos.length).toBeGreaterThan(0);
			expect(result.totalInputValue).toBeGreaterThan(250_000n);
			// Change amount should account for fees
			expect(result.changeAmount).toBeGreaterThanOrEqual(0n);
		});

		it('should throw error when insufficient funds including fees', () => {
			expect(() =>
				selectUtxosWithFee({
					availableUtxos: utxos,
					amountSatoshis: 590_000n, // Very close to total, won't cover fees
					feeRateSatoshisPerByte: 100n // High fee rate
				})
			).toThrow('Insufficient funds');
		});

		it('should throw error when no UTXOs available', () => {
			expect(() =>
				selectUtxosWithFee({
					availableUtxos: [],
					amountSatoshis: 100_000n,
					feeRateSatoshisPerByte: 10n
				})
			).toThrow('No UTXOs available for selection');
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
			})
		];

		it('should filter out locked UTXOs', () => {
			const pendingTxIds = ['01020304']; // Hex of [1, 2, 3, 4]

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

			expect(result).toHaveLength(2);
		});
	});

	describe('getAllUtxosPaginated', () => {
		it('should fetch UTXOs and warn about pagination when limit reached', async () => {
			const mockUtxos = Array.from({ length: 1000 }, (_, i) =>
				createMockUtxo({ value: 100_000 + i })
			);
			const mockResponse: get_utxos_response = {
				utxos: mockUtxos,
				tip_height: 800_000,
				tip_block_hash: new Uint8Array(),
				next_page: []
			};

			vi.mocked(bitcoinApi.getUtxosQuery).mockResolvedValue(mockResponse);
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await getAllUtxosPaginated({
				identity: mockIdentity,
				address: mockAddress,
				network: mockNetwork,
				minterCanisterId: mockMinterCanisterId,
				maxBatchSize: 1000
			});

			expect(result).toEqual(mockUtxos);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Retrieved 1000 UTXOs. There might be more available')
			);

			consoleSpy.mockRestore();
		});

		it('should not warn when UTXO count is below batch size', async () => {
			const mockUtxos = [createMockUtxo({ value: 100_000 })];
			const mockResponse: get_utxos_response = {
				utxos: mockUtxos,
				tip_height: 800_000,
				tip_block_hash: new Uint8Array(),
				next_page: []
			};

			vi.mocked(bitcoinApi.getUtxosQuery).mockResolvedValue(mockResponse);
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			await getAllUtxosPaginated({
				identity: mockIdentity,
				address: mockAddress,
				network: mockNetwork,
				minterCanisterId: mockMinterCanisterId
			});

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});
});
