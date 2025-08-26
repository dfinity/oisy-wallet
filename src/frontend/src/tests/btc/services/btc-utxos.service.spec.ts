// Hoisted holder for values used/assigned inside the vi.mock factory
interface TxEntry {
	txid: unknown;
	utxos?: Array<{ value: bigint; outpoint: { txid: unknown; vout: number } }>;
}
type StoreValue = Record<string, { certified: true; data: Array<TxEntry> | null }>;

interface SetPendingTransactionsParams {
	address: string;
	pendingTransactions: Array<TxEntry>;
}

interface SetPendingTransactionsErrorParams {
	address: string;
}

const mockStoreApi = vi.hoisted(() => ({
	setStoreValue: (_v: StoreValue) => {},
	setPendingTransactions: (_params: SetPendingTransactionsParams) => {},
	setPendingTransactionsError: (_params: SetPendingTransactionsErrorParams) => {},
	reset: () => {}
}));

// Mock the btcPendingSentTransactionsStore BEFORE importing the module under test
vi.mock('$btc/stores/btc-pending-sent-transactions.store', async () => {
	const { writable } = await import('svelte/store');
	const store = writable<StoreValue>({});
	// Assign through the hoisted holder instead of touching top-level variables
	mockStoreApi.setStoreValue = (v: StoreValue) => store.set(v);
	mockStoreApi.setPendingTransactions = ({
		address,
		pendingTransactions
	}: SetPendingTransactionsParams) => {
		store.update((current) => ({
			...current,
			[address]: { certified: true, data: pendingTransactions }
		}));
	};
	mockStoreApi.setPendingTransactionsError = ({ address }: SetPendingTransactionsErrorParams) => {
		store.update((current) => ({
			...current,
			[address]: { certified: true, data: null }
		}));
	};
	mockStoreApi.reset = () => store.set({});

	return {
		btcPendingSentTransactionsStore: {
			...store,
			setPendingTransactions: mockStoreApi.setPendingTransactions,
			setPendingTransactionsError: mockStoreApi.setPendingTransactionsError,
			reset: mockStoreApi.reset
		}
	};
});

// Mock the loadBtcPendingSentTransactions function
vi.mock('$btc/services/btc-pending-sent-transactions.services', () => ({
	loadBtcPendingSentTransactions: vi.fn().mockResolvedValue({ success: true })
}));

import { getFeeRateFromPercentiles, prepareBtcSend } from '$btc/services/btc-utxos.service';
import { BtcPrepareSendError } from '$btc/types/btc-send';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import * as backendApi from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import type { BtcAddress } from '$lib/types/address';
import type { Amount } from '$lib/types/send';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { BitcoinNetwork, Utxo } from '@dfinity/ckbtc';
import type { get_utxos_response } from '@dfinity/ckbtc/dist/candid/bitcoin';

// Mock environment variables
vi.mock('$env/networks/networks.icrc.env', () => ({
	IC_CKBTC_MINTER_CANISTER_ID: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
	BITCOIN_CANISTER_IDS: {
		'rdmx6-jaaaa-aaaah-qcaiq-cai': 'ghsi2-tqaaa-aaaan-aaaca-cai'
	}
}));

describe('btc-utxos.service', () => {
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
		// Initialize the pending transactions store with empty data for the test address
		mockStoreApi.setStoreValue({
			[mockBtcAddress]: { certified: true as const, data: [] }
		});
	});

	describe('prepareBtcSend', () => {
		it('should successfully prepare transaction UTXOs', async () => {
			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

			const result = await prepareBtcSend(defaultParams);

			expect(result).toEqual({
				feeSatoshis: expect.any(BigInt),
				utxos: expect.any(Array),
				error: undefined
			});
			expect(result.feeSatoshis).toBeGreaterThan(ZERO);
			expect(result.utxos.length).toBeGreaterThan(ZERO);

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
				minConfirmations: 6
			});
		});

		it('should return error when no available UTXOs found', async () => {
			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
				...mockUtxosResponse,
				utxos: []
			});

			const result = await prepareBtcSend(defaultParams);

			expect(result).toEqual({
				feeSatoshis: 0n,
				utxos: [],
				error: BtcPrepareSendError.InsufficientBalance
			});
		});

		it('should throw error when pending transactions store is not initialized', async () => {
			// Set store to empty state (no address data)
			mockStoreApi.setStoreValue({});

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

			await expect(prepareBtcSend(defaultParams)).rejects.toThrow(
				'Pending transactions have not been initialized'
			);

			// Verify that no API calls were made since the error is thrown early
			expect(backendApi.getCurrentBtcFeePercentiles).not.toHaveBeenCalled();
			expect(bitcoinApi.getUtxosQuery).not.toHaveBeenCalled();
		});

		it('should throw error when pending transactions data is null for address', async () => {
			// Set store with null data for the address (simulating failed backend call)
			mockStoreApi.setStoreValue({
				[mockBtcAddress]: { certified: true as const, data: null }
			});

			await expect(prepareBtcSend(defaultParams)).rejects.toThrow(
				'Pending transactions have not been initialized'
			);

			// Verify that no API calls were made since the error is thrown early
			expect(backendApi.getCurrentBtcFeePercentiles).not.toHaveBeenCalled();
			expect(bitcoinApi.getUtxosQuery).not.toHaveBeenCalled();
		});

		it('should successfully prepare transaction when pending transactions store is properly initialized', async () => {
			// Ensure store is properly initialized with empty pending transactions
			mockStoreApi.setStoreValue({
				[mockBtcAddress]: { certified: true as const, data: [] }
			});

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

			const result = await prepareBtcSend(defaultParams);

			expect(result).toEqual({
				feeSatoshis: expect.any(BigInt),
				utxos: expect.any(Array),
				error: undefined
			});
			expect(result.feeSatoshis).toBeGreaterThan(ZERO);
			expect(result.utxos.length).toBeGreaterThan(ZERO);

			// Verify that all API calls were made successfully
			expect(backendApi.getCurrentBtcFeePercentiles).toHaveBeenCalled();
			expect(bitcoinApi.getUtxosQuery).toHaveBeenCalled();
		});

		it('should successfully prepare transaction with existing pending transactions', async () => {
			// Initialize store with some pending transactions that have UTXOs
			const mockPendingTransaction = {
				txid: new Uint8Array([99, 100, 101, 102]), // This is the pending transaction ID
				utxos: [
					{
						value: 300000n,
						outpoint: {
							txid: new Uint8Array([200, 201, 202, 203]), // This is the UTXO transaction ID that will be checked
							vout: 0
						}
					}
				]
			};

			mockStoreApi.setStoreValue({
				[mockBtcAddress]: {
					certified: true as const,
					data: [mockPendingTransaction]
				}
			});

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

			const result = await prepareBtcSend(defaultParams);

			expect(result).toEqual({
				feeSatoshis: expect.any(BigInt),
				utxos: expect.any(Array),
				error: undefined
			});
			expect(result.feeSatoshis).toBeGreaterThan(ZERO);
			expect(result.utxos.length).toBeGreaterThan(ZERO);

			// Verify that all API calls were made successfully
			expect(backendApi.getCurrentBtcFeePercentiles).toHaveBeenCalled();
			expect(bitcoinApi.getUtxosQuery).toHaveBeenCalled();
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

		it('should handle insufficient balance for fee scenario', async () => {
			// Mock a scenario where there are UTXOs but insufficient balance for fee
			const smallUtxo: Utxo = {
				value: 10000n, // Small UTXO value
				height: 100,
				outpoint: {
					txid: new Uint8Array([1, 2, 3, 4]),
					vout: 0
				}
			};

			const smallUtxosResponse: get_utxos_response = {
				...mockUtxosResponse,
				utxos: [smallUtxo]
			};

			// Large amount that would require more than available
			const largeAmount = 0.09; // 9,000,000 satoshis, larger than 10,000 satoshi UTXO
			const params = { ...defaultParams, amount: largeAmount };

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(smallUtxosResponse);

			const result = await prepareBtcSend(params);

			expect(result.error).toBe(BtcPrepareSendError.InsufficientBalanceForFee);
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
			expect(result.feeSatoshis).toBeGreaterThan(ZERO);
			expect(result.error).toBeUndefined();
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

			// Should apply minimum fee rate of 1000n millisats/vbyte (median 200n millisats < 1000n, so minimum applies)
			expect(result).toBe(1_000n);
		});

		it('should return capped fee rate when calculated fee is too high', async () => {
			// Very high fees in millisats that should trigger maximum fee rate cap
			const highFeePercentiles = {
				fee_percentiles: [200_000n, 300_000n, 500_000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(highFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Should cap at maximum fee rate of 100_000n millisats/vbyte (median 300_000n > 100_000n, so cap applies)
			expect(result).toBe(100_000n);
		});

		it('should correctly convert from millisats to sats using median', async () => {
			// Fee percentiles in millisats per vbyte - median should be 6000n millisats
			const feePercentiles = {
				fee_percentiles: [2_000n, 4_000n, 6_000n, 8_000n, 10_000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(feePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Median of [2_000n, 4_000n, 6_000n, 8_000n, 10_000n] is 6_000n millisats
			expect(result).toBe(6_000n);
		});

		it('should handle odd number of fee percentiles correctly', async () => {
			// Odd number of percentiles - median should be middle element
			const oddFeePercentiles = {
				fee_percentiles: [3_000n, 5_000n, 7_000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(oddFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Median of [3_000n, 5_000n, 7_000n] is 5_000n millisats
			expect(result).toBe(5_000n);
		});

		it('should handle even number of fee percentiles correctly', async () => {
			// Even number of percentiles - should take middle element (index 1 for length 4)
			const evenFeePercentiles = {
				fee_percentiles: [2_000n, 4_000n, 6_000n, 8_000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(evenFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Math.floor(4 / 2) = 2, so percentiles[2] = 6_000n millisats
			expect(result).toBe(6_000n);
		});

		it('should handle single fee percentile correctly', async () => {
			// Single percentile - should use that value as median
			const singleFeePercentile = {
				fee_percentiles: [5_000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(singleFeePercentile);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// Single value 5_000n millisats
			expect(result).toBe(5_000n);
		});

		it('should handle zero fee percentile with minimum fallback', async () => {
			// Zero fee that should trigger minimum fee rate
			const zeroFeePercentiles = {
				fee_percentiles: [ZERO]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(zeroFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 0n millisats, should apply minimum of 1_000n millisats/vbyte
			expect(result).toBe(1_000n);
		});

		it('should handle boundary case at minimum fee rate threshold', async () => {
			// Exactly 1_000n millisats/vbyte (should not trigger minimum)
			const boundaryFeePercentiles = {
				fee_percentiles: [1_000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(boundaryFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 1_000n millisats/vbyte, should not trigger minimum fallback
			expect(result).toBe(1_000n);
		});

		it('should handle boundary case at maximum fee rate threshold', async () => {
			// Exactly 100_000n millisats/vbyte (should not trigger cap)
			const boundaryFeePercentiles = {
				fee_percentiles: [100_000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(boundaryFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 100_000n millisats/vbyte, should not trigger cap
			expect(result).toBe(100_000n);
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
			// Fee smaller than 1_000n millisats will trigger minimum
			const smallFeePercentiles = {
				fee_percentiles: [999n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(smallFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 999n millisats < 1_000n, should apply minimum of 1_000n millisats/vbyte
			expect(result).toBe(1_000n);
		});

		it('should handle fee rate just above maximum threshold', async () => {
			// Fee just above 100_000n millisats should be capped
			const aboveMaxFeePercentiles = {
				fee_percentiles: [100_001n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(aboveMaxFeePercentiles);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 100_001n millisats > 100_000n, should be capped to 100_000n millisats/vbyte
			expect(result).toBe(100_000n);
		});

		it('should handle fee rate significantly above maximum threshold', async () => {
			// Fee significantly above maximum should be capped
			const wayAboveMaxFeePercentiles = {
				fee_percentiles: [500_000n]
			};

			vi.spyOn(backendApi, 'getCurrentBtcFeePercentiles').mockResolvedValue(
				wayAboveMaxFeePercentiles
			);

			const result = await getFeeRateFromPercentiles({
				identity: mockIdentity,
				network: mockNetwork
			});

			// 500_000n millisats > 100_000n, should be capped to 100_000n millisats/vbyte
			expect(result).toBe(100_000n);
		});
	});
});
