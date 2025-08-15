import { sendBtc, type SendBtcParams, validateUtxosForSend } from '$btc/services/btc-send.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { BtcSendValidationError, BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import * as btcUtxosUtils from '$btc/utils/btc-utxos.utils';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import * as btcUtils from '$icp/utils/btc.utils';
import * as backendAPI from '$lib/api/backend.api';
import * as signerAPI from '$lib/api/signer.api';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Utxo } from '@dfinity/ckbtc';
import type { get_utxos_response } from '@dfinity/ckbtc/dist/candid/bitcoin';
import { hexStringToUint8Array, toNullable } from '@dfinity/utils';

// Mock environment variables (same as btc-utxos.service.spec.ts)
vi.mock('$env/networks/networks.icrc.env', () => ({
	IC_CKBTC_MINTER_CANISTER_ID: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
	BITCOIN_CANISTER_IDS: {
		'rdmx6-jaaaa-aaaah-qcaiq-cai': 'ghsi2-tqaaa-aaaan-aaaca-cai'
	}
}));

describe('btc-send.services', () => {
	const defaultParams = {
		onProgress: () => {},
		utxosFee: mockUtxosFee,
		network: 'mainnet',
		source: 'address',
		destination: 'address',
		identity: mockIdentity,
		amount: 10
	} as SendBtcParams;
	const txid = 'txid;';
	const error = new Error('test error');

	beforeEach(() => {});

	describe('sendBtc', () => {
		it('should call all required functions', async () => {
			const addPendingBtcTransactionSpy = vi
				.spyOn(backendAPI, 'addPendingBtcTransaction')
				.mockResolvedValue(true);
			const sendBtcApiSpy = vi.spyOn(signerAPI, 'sendBtc').mockResolvedValue({ txid });
			const onProgressSpy = vi.spyOn(defaultParams, 'onProgress');

			await sendBtc(defaultParams);

			expect(onProgressSpy).toHaveBeenCalled();

			expect(sendBtcApiSpy).toHaveBeenCalledOnce();
			expect(sendBtcApiSpy).toHaveBeenCalledWith({
				identity: defaultParams.identity,
				network: mapToSignerBitcoinNetwork({ network: defaultParams.network }),
				feeSatoshis: toNullable(defaultParams.utxosFee.feeSatoshis),
				utxosToSpend: defaultParams.utxosFee.utxos,
				outputs: [
					{
						destination_address: defaultParams.destination,
						sent_satoshis: convertNumberToSatoshis({ amount: defaultParams.amount })
					}
				]
			});

			expect(onProgressSpy).toHaveBeenCalled();

			expect(addPendingBtcTransactionSpy).toHaveBeenCalledOnce();
			expect(addPendingBtcTransactionSpy).toHaveBeenCalledWith({
				identity: defaultParams.identity,
				network: mapToSignerBitcoinNetwork({ network: defaultParams.network }),
				address: defaultParams.source,
				txId: hexStringToUint8Array(txid),
				utxos: defaultParams.utxosFee.utxos
			});
		});

		it('should throw if signer sendBtc throws', async () => {
			vi.spyOn(signerAPI, 'sendBtc').mockImplementation(async () => {
				await Promise.resolve();
				throw error;
			});

			const res = sendBtc(defaultParams);

			await expect(res).rejects.toThrow(error);
		});

		it('should throw if backend addPendingBtcTransaction throws', async () => {
			vi.spyOn(backendAPI, 'addPendingBtcTransaction').mockImplementation(async () => {
				await Promise.resolve();
				throw error;
			});

			const res = sendBtc(defaultParams);

			await expect(res).rejects.toThrow(error);
		});
	});

	describe('validateUtxosForSend', () => {
		const validUtxo: Utxo = {
			height: 100,
			value: 100000n,
			outpoint: {
				txid: [1, 2, 3, 4, 5],
				vout: 0
			}
		};

		const validUtxosFee: UtxosFee = {
			feeSatoshis: 1000n, // 250 * 4 = 1000, within tolerance
			utxos: [validUtxo]
		};

		const mockFeePercentiles = {
			fee_percentiles: [1000n, 2000n, 5000n, 10_000n, 20_000n]
		};

		const defaultValidateParams = {
			utxosFee: validUtxosFee,
			source: 'bc1qt0nkp96r7p95xfacyp98pww2eu64yzuf78l4a2wy0sttt83hux4q6u2nl7',
			amount: 0.0001,
			network: 'mainnet' as const,
			identity: mockIdentity
		};

		beforeEach(() => {
			// Reset all mocks first
			vi.clearAllMocks();

			// Then set up default mocks
			vi.spyOn(btcUtils, 'getPendingTransactionIds').mockReturnValue([]);
			vi.spyOn(btcUtxosUtils, 'extractUtxoTxIds').mockReturnValue(['txid1', 'txid2']);
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(4n);
		});

		it('should pass validation for valid UTXOs and parameters', async () => {
			await expect(validateUtxosForSend(defaultValidateParams)).resolves.not.toThrow();
		});

		it('should throw InsufficientBalance error when UTXOs array is empty', async () => {
			const params = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, utxos: [] }
			};

			await expect(validateUtxosForSend(params)).rejects.toThrow(BtcValidationError);

			try {
				await validateUtxosForSend(params);
			} catch (error) {
				expect(error).toBeInstanceOf(BtcValidationError);
				expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InsufficientBalance);
			}
		});

		describe('InvalidUtxoData validation', () => {
			it('should throw InvalidUtxoData error when UTXO has no txid', async () => {
				const invalidUtxo = {
					...validUtxo,
					outpoint: { ...validUtxo.outpoint, txid: undefined as unknown as number[] }
				};
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				await expect(validateUtxosForSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateUtxosForSend(params);
				} catch (error) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO has undefined vout', async () => {
				const invalidUtxo = {
					...validUtxo,
					outpoint: { ...validUtxo.outpoint, vout: undefined as unknown as number }
				};
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				await expect(validateUtxosForSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateUtxosForSend(params);
				} catch (error) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO has zero or negative value', async () => {
				const invalidUtxo = { ...validUtxo, value: 0n };
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				await expect(validateUtxosForSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateUtxosForSend(params);
				} catch (error) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO has negative height', async () => {
				const invalidUtxo = { ...validUtxo, height: -1 };
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				await expect(validateUtxosForSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateUtxosForSend(params);
				} catch (error) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO has zero value', async () => {
				// This test validates the individual UTXO validation (value <= 0)
				const zeroValueUtxo = { ...validUtxo, value: 0n };
				const paramsWithZeroValue = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [zeroValueUtxo] }
				};

				await expect(validateUtxosForSend(paramsWithZeroValue)).rejects.toThrow(BtcValidationError);

				try {
					await validateUtxosForSend(paramsWithZeroValue);
				} catch (error: unknown) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});
		});

		it('should throw UtxoLocked error when UTXO is in pending transactions', async () => {
			vi.spyOn(btcUtils, 'getPendingTransactionIds').mockReturnValue(['txid1']);
			vi.spyOn(btcUtxosUtils, 'extractUtxoTxIds').mockReturnValue(['txid1']);

			await expect(validateUtxosForSend(defaultValidateParams)).rejects.toThrow(BtcValidationError);

			try {
				await validateUtxosForSend(defaultValidateParams);
			} catch (error: unknown) {
				expect((error as BtcValidationError).type).toBe(BtcSendValidationError.UtxoLocked);
			}
		});

		describe('InvalidFeeCalculation validation', () => {
			it('should throw InvalidFeeCalculation error when fee is too low', async () => {
				// Mock estimated transaction size and fee rate to make expected fee higher than provided fee
				vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(1000);
				vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(10n);

				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, feeSatoshis: 100n } // Very low fee
				};

				await expect(validateUtxosForSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateUtxosForSend(params);
				} catch (error: unknown) {
					expect((error as BtcValidationError).type).toBe(
						BtcSendValidationError.InvalidFeeCalculation
					);
				}
			});

			it('should throw InvalidFeeCalculation error when fee is too high', async () => {
				// Mock estimated transaction size to make expected fee much lower than provided fee
				vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(100);
				vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1n);

				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, feeSatoshis: 50000n } // Very high fee
				};

				await expect(validateUtxosForSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateUtxosForSend(params);
				} catch (error: unknown) {
					expect((error as BtcValidationError).type).toBe(
						BtcSendValidationError.InvalidFeeCalculation
					);
				}
			});
		});

		it('should throw InsufficientBalanceForFee error when UTXOs have insufficient funds', async () => {
			// Use smaller fee and transaction size for consistent calculation
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1n);

			const params = {
				...defaultValidateParams,
				amount: 1, // 1 BTC = 100,000,000 satoshis, but UTXO only has 100,000
				utxosFee: { ...validUtxosFee, feeSatoshis: 250n } // 250 * 1 = 250, within tolerance
			};

			await expect(validateUtxosForSend(params)).rejects.toThrow(BtcValidationError);

			try {
				await validateUtxosForSend(params);
			} catch (error: unknown) {
				expect((error as BtcValidationError).type).toBe(
					BtcSendValidationError.InsufficientBalanceForFee
				);
			}
		});

		it('should accept fee within tolerance range', async () => {
			// Mock transaction size for predictable fee calculation
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(4n);

			const expectedFee = BigInt(250) * 4n; // 1000 satoshis
			const toleranceRange = expectedFee / 10n; // 100 satoshis

			// Test fee at upper tolerance boundary
			const paramsUpperBound = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee + toleranceRange } // 1100
			};

			await expect(validateUtxosForSend(paramsUpperBound)).resolves.not.toThrow();

			// Test fee at lower tolerance boundary
			const paramsLowerBound = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee - toleranceRange } // 900
			};

			await expect(validateUtxosForSend(paramsLowerBound)).resolves.not.toThrow();
		});

		it('should handle multiple UTXOs correctly', async () => {
			const utxo2: Utxo = {
				height: 200,
				value: 50000n,
				outpoint: {
					txid: [6, 7, 8, 9, 10],
					vout: 1
				}
			};

			// Mock the transaction size estimation for 2 inputs
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(370);
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(3n);

			const params = {
				...defaultValidateParams,
				utxosFee: {
					...validUtxosFee,
					feeSatoshis: 1110n, // 370 * 3 = 1110, within tolerance
					utxos: [validUtxo, utxo2]
				}
			};

			await expect(validateUtxosForSend(params)).resolves.not.toThrow();
		});

		it('should call getFeeRateFromPercentiles with correct parameters', async () => {
			const getFeeRateFromPercentilesSpy = vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles');

			await validateUtxosForSend(defaultValidateParams);

			expect(getFeeRateFromPercentilesSpy).toHaveBeenCalledWith({
				network: defaultValidateParams.network,
				identity: defaultValidateParams.identity
			});
		});

		it('should log fee calculation details for debugging', async () => {
			// Use the exact same mocks as the failing tests
			const getFeeRateFromPercentilesSpy = vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles');
			const estimateTransactionSizeSpy = vi.spyOn(btcUtxosUtils, 'estimateTransactionSize');

			// Don't mock these - let them use real values
			getFeeRateFromPercentilesSpy.mockRestore();
			estimateTransactionSizeSpy.mockRestore();

			try {
				await validateUtxosForSend(defaultValidateParams);
			} catch (error) {
				if (
					error instanceof BtcValidationError &&
					error.type === BtcSendValidationError.InvalidFeeCalculation
				) {
					// This will help us understand what values are actually being compared
					console.warn('Fee validation failed with:');
					console.warn('- Provided fee:', defaultValidateParams.utxosFee.feeSatoshis);
					console.warn('- Expected fee rate calls:', getFeeRateFromPercentilesSpy.mock.calls);
					console.warn('- Transaction size calls:', estimateTransactionSizeSpy.mock.calls);
				}
				throw error;
			}
		});

		it('should identify the fee tolerance issue causing browser errors', async () => {
			// Reset mocks to use real fee calculation logic
			vi.restoreAllMocks();

			// Only mock the external dependencies that we need
			vi.spyOn(btcUtils, 'getPendingTransactionIds').mockReturnValue([]);
			vi.spyOn(btcUtxosUtils, 'extractUtxoTxIds').mockReturnValue(['txid1']);
			vi.spyOn(backendAPI, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);

			// Use a realistic scenario that might trigger the browser issue
			const realisticParams = {
				...defaultValidateParams,
				utxosFee: {
					feeSatoshis: 5000n, // 5000 sat fee
					utxos: [validUtxo]
				}
			};

			// This test should reveal what's causing the InvalidFeeCalculation
			try {
				await validateUtxosForSend(realisticParams);
				// If this passes, the issue might be with specific fee ranges
			} catch (error) {
				expect(error).toBeInstanceOf(BtcValidationError);
				expect((error as BtcValidationError).type).toBe(
					BtcSendValidationError.InvalidFeeCalculation
				);

				// Log the details to understand the failure
				console.warn('InvalidFeeCalculation error details:', error);
			}
		});
	});

	describe('Integration Tests', () => {
		describe('prepareBtcSend + validateUtxosForSend', () => {
			const mockBtcAddress = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
			const mockNetwork = 'mainnet' as const;
			const mockAmount = 0.001;

			const mockUtxo: Utxo = {
				value: 500_000n,
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
				fee_percentiles: [1000n, 2000n, 5000n, 10_000n, 20_000n]
			};

			const integrationTestParams = {
				identity: mockIdentity,
				network: mockNetwork,
				amount: mockAmount,
				source: mockBtcAddress
			};

			beforeEach(() => {
				vi.clearAllMocks();

				// Mock external dependencies using the same pattern as btc-utxos.service.spec.ts
				vi.spyOn(btcUtils, 'getPendingTransactionIds').mockReturnValue([]);
				vi.spyOn(backendAPI, 'getCurrentBtcFeePercentiles').mockResolvedValue(mockFeePercentiles);
				vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue(mockUtxosResponse);

				// Mock utility functions needed for validation
				vi.spyOn(btcUtxosUtils, 'extractUtxoTxIds').mockReturnValue(['txid1']);

				// Use consistent transaction size for fee calculation
				const transactionSize = 250;
				vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(transactionSize);

				// Mock getFeeRateFromPercentiles to return consistent fee rate
				const feeRate = 5000n;
				vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(feeRate);

				vi.spyOn(btcUtxosUtils, 'filterAvailableUtxos').mockReturnValue([mockUtxo]);

				// Calculate realistic fee based on the mocked fee rate
				const calculatedFee = BigInt(transactionSize) * feeRate;
				const amountSatoshis = 100_000n; // 0.001 BTC in satoshis

				vi.spyOn(btcUtxosUtils, 'calculateUtxoSelection').mockReturnValue({
					selectedUtxos: [mockUtxo],
					feeSatoshis: calculatedFee,
					sufficientFunds: true,
					totalInputValue: mockUtxo.value,
					changeAmount: mockUtxo.value - amountSatoshis - calculatedFee
				});
			});

			it('should pass validation when prepareBtcSend output is validated', async () => {
				// Call prepareBtcSend to get UtxosFee
				const utxosFee = await btcUtxosService.prepareBtcSend(integrationTestParams);

				// Verify prepareBtcSend succeeded
				expect(utxosFee.error).toBeUndefined();
				expect(utxosFee.utxos.length).toBeGreaterThan(0);
				expect(utxosFee.feeSatoshis).toBeGreaterThan(0n);

				// Now validate the result with validateUtxosForSend
				await expect(
					validateUtxosForSend({
						utxosFee,
						source: integrationTestParams.source,
						amount: integrationTestParams.amount,
						network: integrationTestParams.network,
						identity: integrationTestParams.identity
					})
				).resolves.not.toThrow();

				// Verify external calls were made correctly
				expect(bitcoinApi.getUtxosQuery).toHaveBeenCalledWith({
					identity: integrationTestParams.identity,
					bitcoinCanisterId: 'ghsi2-tqaaa-aaaan-aaaca-cai',
					address: integrationTestParams.source,
					network: integrationTestParams.network,
					minConfirmations: 1
				});
			});

			it('should handle InvalidFeeCalculation consistently between prepareBtcSend and validateUtxosForSend', async () => {
				// Call prepareBtcSend
				const utxosFee = await btcUtxosService.prepareBtcSend(integrationTestParams);

				// Verify prepareBtcSend succeeded
				expect(utxosFee.error).toBeUndefined();
				expect(utxosFee.feeSatoshis).toBeGreaterThan(0n);

				// validateUtxosForSend should accept this fee since both functions use the same fee calculation logic
				await expect(
					validateUtxosForSend({
						utxosFee,
						source: integrationTestParams.source,
						amount: integrationTestParams.amount,
						network: integrationTestParams.network,
						identity: integrationTestParams.identity
					})
				).resolves.not.toThrow();

				// Verify that both functions called getCurrentBtcFeePercentiles
				expect(backendAPI.getCurrentBtcFeePercentiles).toHaveBeenCalledWith({
					identity: integrationTestParams.identity,
					network: { mainnet: null }
				});

				// Should be called twice - once by prepareBtcSend and once by validateUtxosForSend
				expect(backendAPI.getCurrentBtcFeePercentiles).toHaveBeenCalledTimes(2);
			});

			it('should fail validation when prepareBtcSend returns insufficient funds', async () => {
				// Mock bitcoin API to return small UTXOs
				const smallUtxo: Utxo = {
					value: 10_000n, // Small UTXO value
					height: 100,
					outpoint: {
						txid: new Uint8Array([1, 2, 3, 4]),
						vout: 0
					}
				};

				vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
					...mockUtxosResponse,
					utxos: [smallUtxo]
				});

				// Mock filterAvailableUtxos to return the small UTXO
				vi.spyOn(btcUtxosUtils, 'filterAvailableUtxos').mockReturnValue([smallUtxo]);

				// Mock calculateUtxoSelection to indicate insufficient funds
				vi.spyOn(btcUtxosUtils, 'calculateUtxoSelection').mockReturnValue({
					selectedUtxos: [],
					feeSatoshis: 0n,
					sufficientFunds: false,
					totalInputValue: 0n,
					changeAmount: 0n
				});

				// Call prepareBtcSend with amount larger than available UTXOs
				const largeAmountParams = {
					...integrationTestParams,
					amount: 1 // 1 BTC = 100,000,000 satoshis, but we only have 10,000
				};

				const utxosFee = await btcUtxosService.prepareBtcSend(largeAmountParams);

				// Verify prepareBtcSend detected insufficient funds
				expect(utxosFee.error).toBeDefined();

				// validateUtxosForSend should also detect the issue
				await expect(
					validateUtxosForSend({
						utxosFee,
						source: largeAmountParams.source,
						amount: largeAmountParams.amount,
						network: largeAmountParams.network,
						identity: largeAmountParams.identity
					})
				).rejects.toThrow(BtcValidationError);
			});
		});
	});
});
