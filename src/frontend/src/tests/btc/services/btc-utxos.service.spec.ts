import {
	type BtcReviewResult,
	getFeeRateFromPercentiles,
	prepareBtcSend
} from '$btc/services/btc-utxos.service';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import * as backendApi from '$lib/api/backend.api';
import type { BtcAddress } from '$lib/types/address';
import type { Amount } from '$lib/types/send';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork, Utxo } from '@dfinity/ckbtc';
import type { get_utxos_response } from '@dfinity/ckbtc/dist/candid/bitcoin';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock environment variables
vi.mock('$env/networks/networks.icrc.env', () => ({
	CKBTC_MINTER_CANISTER_ID: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
	BITCOIN_CANISTER_IDS: {
		'rdmx6-jaaaa-aaaah-qcaiq-cai': 'ghsi2-tqaaa-aaaan-aaaca-cai'
	}
}));

describe('btc-review.services', () => {
	const mockBtcAddress: BtcAddress = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
	const mockNetwork: BitcoinNetwork = 'mainnet';
	const mockAmount: Amount = 0.001;

	const mockUtxo: Utxo = {
		value: 500000n,
		height: 100,
		outpoint: {
			txid: new Uint8Array([1, 2, 3, 4]),
			vout: 0
		}
	};

	const mockUtxosResponse: get_utxos_response = {
		utxos: [mockUtxo],
		tip_block_hash: new Uint8Array([5, 6, 7, 8]),
		tip_height: 150,
		next_page: []
	};

	const mockFeePercentiles = {
		fee_percentiles: [1000n, 2000n, 5000n, 10000n, 20000n]
	};

	const defaultParams = {
		identity: mockIdentity,
		network: mockNetwork,
		amount: mockAmount,
		source: mockBtcAddress
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('prepareTransactionUtxos', () => {
		it('should successfully prepare transaction UTXOs', async () => {
			// Only mock API functions
			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

			const result: BtcReviewResult = await prepareBtcSend(defaultParams);

			expect(result).toEqual({
				feeSatoshis: expect.any(BigInt),
				utxos: expect.any(Array),
				totalInputValue: expect.any(BigInt),
				changeAmount: expect.any(BigInt)
			});

			// Verify API functions were called
			expect(backendApi.getCurrentBtcFeePercentiles).toHaveBeenCalledWith({
				identity: mockIdentity,
				network: { mainnet: null }
			});
			expect(bitcoinApi.getUtxosQuery).toHaveBeenCalledWith({
				identity: mockIdentity,
				bitcoinCanisterId: 'ghsi2-tqaaa-aaaan-aaaca-cai',
				address: mockBtcAddress,
				network: mockNetwork,
				minConfirmations: 1
			});
		});

		it('should throw error when identity is null', async () => {
			const params = { ...defaultParams, identity: null as unknown as Identity };

			await expect(prepareBtcSend(params)).rejects.toThrow();
		});

		it('should throw error when source address is empty', async () => {
			const params = { ...defaultParams, source: '' as BtcAddress };

			await expect(prepareBtcSend(params)).rejects.toThrow('Source address is required');
		});

		it('should throw error when no available UTXOs found', async () => {
			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
				...mockUtxosResponse,
				// No UTXOs available
				utxos: []
			});

			await expect(prepareBtcSend(defaultParams)).rejects.toThrow(
				'No available UTXOs found for the transaction'
			);
		});

		it('should handle testnet network correctly', async () => {
			const testnetParams = { ...defaultParams, network: 'testnet' as BitcoinNetwork };

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

			await prepareBtcSend(testnetParams);

			expect(backendApi.getCurrentBtcFeePercentiles).toHaveBeenCalledWith({
				identity: mockIdentity,
				network: { testnet: null }
			});
		});

		it('should handle regtest network correctly', async () => {
			const regtestParams = { ...defaultParams, network: 'regtest' as BitcoinNetwork };

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

			await prepareBtcSend(regtestParams);

			expect(backendApi.getCurrentBtcFeePercentiles).toHaveBeenCalledWith({
				identity: mockIdentity,
				network: { regtest: null }
			});
		});

		it('should propagate errors from backend API', async () => {
			const apiError = new Error('Backend API error');

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockRejectedValue(apiError);

			await expect(prepareBtcSend(defaultParams)).rejects.toThrow('Backend API error');
		});

		it('should propagate errors from bitcoin API', async () => {
			const bitcoinApiError = new Error('Bitcoin API error');

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockRejectedValue(bitcoinApiError);

			await expect(prepareBtcSend(defaultParams)).rejects.toThrow('Bitcoin API error');
		});

		it('should handle insufficient funds scenario', async () => {
			// 10 BTC - larger than available UTXO
			const largeAmount = 10;
			const params = { ...defaultParams, amount: largeAmount };

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

			// Should throw when trying to spend more than available
			await expect(prepareBtcSend(params)).rejects.toThrow();
		});

		it('should handle multiple UTXOs correctly', async () => {
			const mockUtxo2: Utxo = {
				value: 300000n,
				height: 101,
				outpoint: {
					txid: new Uint8Array([5, 6, 7, 8]),
					vout: 1
				}
			};

			const multipleUtxosResponse: get_utxos_response = {
				...mockUtxosResponse,
				utxos: [mockUtxo, mockUtxo2]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(multipleUtxosResponse);

			const result = await prepareBtcSend(defaultParams);

			expect(result.utxos.length).toBeGreaterThanOrEqual(1);
			expect(result.totalInputValue).toBeGreaterThan(0n);
		});
	});

	describe('getFeeRateFromPercentiles', () => {
		it('should throw error when no fee percentiles are available', async () => {
			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue({
				fee_percentiles: []
			});

			await expect(
				getFeeRateFromPercentiles({
					identity: mockIdentity,
					network: mockNetwork
				})
			).rejects.toThrow('No fee percentiles available - cannot calculate transaction fee');
		});

		it('should throw error when fee percentiles is null', async () => {
			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue({
				fee_percentiles: null as unknown as bigint[]
			});

			await expect(
				getFeeRateFromPercentiles({
					identity: mockIdentity,
					network: mockNetwork
				})
			).rejects.toThrow('No fee percentiles available - cannot calculate transaction fee');
		});

		it('should return minimum fee rate when calculated fee is too low', async () => {
			// Very low fees in millisats that should trigger minimum fee rate
			const lowFeePercentiles = {
				fee_percentiles: [100n, 200n, 500n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(lowFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Should apply minimum fee rate of 1 sat/vbyte (median 200n millisats = 0n sats, so minimum applies)
			expect(result).toBe(1n);
		});

		it('should return capped fee rate when calculated fee is too high', async () => {
			// Very high fees in millisats that should trigger maximum fee rate cap
			const highFeePercentiles = {
				fee_percentiles: [200000n, 300000n, 500000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(highFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Should cap at maximum fee rate of 100 sat/vbyte (median 300000n millisats = 300n sats, so cap applies)
			expect(result).toBe(100n);
		});

		it('should correctly convert from millisats to sats using median', async () => {
			// Fee percentiles in millisats per vbyte - median should be 6000n millisats = 6n sats
			const feePercentiles = {
				fee_percentiles: [2000n, 4000n, 6000n, 8000n, 10000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(feePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Median of [2000n, 4000n, 6000n, 8000n, 10000n] is 6000n millisats = 6n sats
			expect(result).toBe(6n);
		});

		it('should handle odd number of fee percentiles correctly', async () => {
			// Odd number of percentiles - median should be middle element
			const oddFeePercentiles = {
				fee_percentiles: [3000n, 5000n, 7000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(oddFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Median of [3000n, 5000n, 7000n] is 5000n millisats = 5n sats
			expect(result).toBe(5n);
		});

		it('should handle even number of fee percentiles correctly', async () => {
			// Even number of percentiles - should take middle element (index 1 for length 4)
			const evenFeePercentiles = {
				fee_percentiles: [2000n, 4000n, 6000n, 8000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(evenFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Math.floor(4 / 2) = 2, so percentiles[2] = 6000n millisats = 6n sats
			expect(result).toBe(6n);
		});

		it('should handle single fee percentile correctly', async () => {
			// Single percentile - should use that value as median
			const singleFeePercentile = {
				fee_percentiles: [5000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(singleFeePercentile);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Single value 5000n millisats = 5n sats
			expect(result).toBe(5n);
		});

		it('should handle zero fee percentile with minimum fallback', async () => {
			// Zero fee that should trigger minimum fee rate
			const zeroFeePercentiles = {
				fee_percentiles: [0n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(zeroFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 0n millisats = 0n sats, should apply minimum of 1n sat/vbyte
			expect(result).toBe(1n);
		});

		it('should handle boundary case at minimum fee rate threshold', async () => {
			// Exactly 1000n millisats = 1n sat/vbyte (should not trigger minimum)
			const boundaryFeePercentiles = {
				fee_percentiles: [1000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(boundaryFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 1000n millisats = 1n sat/vbyte, should not trigger minimum fallback
			expect(result).toBe(1n);
		});

		it('should handle boundary case at maximum fee rate threshold', async () => {
			// Exactly 100000n millisats = 100n sat/vbyte (should not trigger cap)
			const boundaryFeePercentiles = {
				fee_percentiles: [100000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(boundaryFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 100000n millisats = 100n sat/vbyte, should not trigger cap
			expect(result).toBe(100n);
		});

		it('should handle testnet network correctly', async () => {
			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);

			await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: 'testnet'
			});

			expect(backendApi.getCurrentBtcFeePercentiles).toHaveBeenCalledWith({
				identity: mockIdentity,
				network: { testnet: null }
			});
		});

		it('should handle regtest network correctly', async () => {
			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);

			await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: 'regtest'
			});

			expect(backendApi.getCurrentBtcFeePercentiles).toHaveBeenCalledWith({
				identity: mockIdentity,
				network: { regtest: null }
			});
		});

		it('should propagate errors from backend API', async () => {
			const apiError = new Error('Backend API error');

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockRejectedValue(apiError);

			await expect(
				getFeeRateFromPercentiles({
					identity: mockIdentity,
					network: mockNetwork
				})
			).rejects.toThrow('Backend API error');
		});

		it('should handle very small non-zero fee that rounds to zero', async () => {
			// Fee smaller than 1000n millisats will round to 0n sats, triggering minimum
			const smallFeePercentiles = {
				fee_percentiles: [999n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(smallFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 999n millisats = 0n sats (rounded down), should apply minimum of 1n sat/vbyte
			expect(result).toBe(1n);
		});

		it('should handle fee rate just above maximum threshold', async () => {
			// Fee just above 100000n millisats should be capped
			const aboveMaxFeePercentiles = {
				fee_percentiles: [100001n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(aboveMaxFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 100001n millisats = 100n sats (rounded down), should not be capped
			expect(result).toBe(100n);
		});

		it('should handle fee rate significantly above maximum threshold', async () => {
			// Fee significantly above maximum should be capped
			const wayAboveMaxFeePercentiles = {
				fee_percentiles: [500000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(
				wayAboveMaxFeePercentiles
			);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 500000n millisats = 500n sats, should be capped to 100n sat/vbyte
			expect(result).toBe(100n);
		});
	});
});
