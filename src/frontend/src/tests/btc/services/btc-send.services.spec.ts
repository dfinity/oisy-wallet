import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import { sendBtc, validateBtcSend, type SendBtcParams } from '$btc/services/btc-send.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { BtcSendValidationError, BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import * as btcUtxosUtils from '$btc/utils/btc-utxos.utils';
import * as btcUtils from '$icp/utils/btc.utils';
import * as backendAPI from '$lib/api/backend.api';
import * as signerAPI from '$lib/api/signer.api';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Utxo } from '@dfinity/ckbtc';
import { toNullable } from '@dfinity/utils';

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
			const txidStringToUint8ArraySpy = vi
				.spyOn(btcUtils, 'txidStringToUint8Array')
				.mockReturnValue(new Uint8Array());
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

			expect(txidStringToUint8ArraySpy).toHaveBeenCalledWith(txid);

			expect(addPendingBtcTransactionSpy).toHaveBeenCalledOnce();
			expect(addPendingBtcTransactionSpy).toHaveBeenCalledWith({
				identity: defaultParams.identity,
				network: mapToSignerBitcoinNetwork({ network: defaultParams.network }),
				address: defaultParams.source,
				txId: new Uint8Array(),
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
			vi.spyOn(
				btcPendingSentTransactionsServices,
				'loadBtcPendingSentTransactions'
			).mockResolvedValue({ success: true });
			vi.spyOn(btcUtils, 'getPendingTransactionUtxoTxIds').mockReturnValue([]);
			vi.spyOn(btcUtxosUtils, 'extractUtxoTxIds').mockReturnValue(['txid1', 'txid2']);
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(4000n);
		});

		it('should pass validation for valid UTXOs and parameters', async () => {
			await expect(validateBtcSend(defaultValidateParams)).resolves.not.toThrow();
		});

		it('should throw InvalidAmount error when amount is invalid', async () => {
			const params = {
				...defaultValidateParams,
				amount: -1 // Invalid negative amount
			};

			await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

			try {
				await validateBtcSend(params);
			} catch (error) {
				expect(error).toBeInstanceOf(BtcValidationError);
				expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidAmount);
			}
		});

		it('should throw InsufficientBalance error when UTXOs array is empty', async () => {
			const params = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, utxos: [] }
			};

			await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

			try {
				await validateBtcSend(params);
			} catch (error) {
				expect(error).toBeInstanceOf(BtcValidationError);
				expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InsufficientBalance);
			}
		});

		describe('InvalidUtxoData validation', () => {
			it('should throw InvalidUtxoData error when UTXO has no txid', async () => {
				const invalidUtxo = {
					...validUtxo,
					outpoint: { ...validUtxo.outpoint, txid: [] as number[] }
				};
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateBtcSend(params);
				} catch (error) {
					expect(error).toBeInstanceOf(BtcValidationError);
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

				await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateBtcSend(params);
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

				await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateBtcSend(params);
				} catch (error) {
					expect(error).toBeInstanceOf(BtcValidationError);
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO has negative height', async () => {
				const invalidUtxo = { ...validUtxo, height: -1 };
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateBtcSend(params);
				} catch (error) {
					expect(error).toBeInstanceOf(BtcValidationError);
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO outpoint is missing', async () => {
				const invalidUtxo = {
					...validUtxo,
					outpoint: undefined as unknown as typeof validUtxo.outpoint
				};
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateBtcSend(params);
				} catch (error) {
					expect(error).toBeInstanceOf(BtcValidationError);
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});
		});

		it('should throw UtxoLocked error when UTXO is in pending transactions', async () => {
			vi.spyOn(btcUtils, 'getPendingTransactionUtxoTxIds').mockReturnValue(['txid1']);
			vi.spyOn(btcUtxosUtils, 'extractUtxoTxIds').mockReturnValue(['txid1']);

			await expect(validateBtcSend(defaultValidateParams)).rejects.toThrow(BtcValidationError);

			try {
				await validateBtcSend(defaultValidateParams);
			} catch (error: unknown) {
				expect((error as BtcValidationError).type).toBe(BtcSendValidationError.UtxoLocked);
			}
		});

		describe('InvalidFeeCalculation validation', () => {
			it('should throw InvalidFeeCalculation error when fee is too low', async () => {
				// Mock estimated transaction size and fee rate to make expected fee higher than provided fee
				vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(1000);
				vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(10000n);

				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, feeSatoshis: 100n } // Very low fee
				};

				await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateBtcSend(params);
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

				await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

				try {
					await validateBtcSend(params);
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
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);

			const params = {
				...defaultValidateParams,
				amount: 1, // 1 BTC = 100,000,000 satoshis, but UTXO only has 100,000
				utxosFee: { ...validUtxosFee, feeSatoshis: 250n } // 250 * 1 = 250, within tolerance
			};

			await expect(validateBtcSend(params)).rejects.toThrow(BtcValidationError);

			try {
				await validateBtcSend(params);
			} catch (error: unknown) {
				expect((error as BtcValidationError).type).toBe(
					BtcSendValidationError.InsufficientBalanceForFee
				);
			}
		});

		it('should accept fee within tolerance range', async () => {
			// Mock transaction size for predictable fee calculation
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(4000n);

			const expectedFee = BigInt(250) * 4n; // 1000 satoshis
			const toleranceRange = expectedFee / 10n; // 100 satoshis

			// Test fee at upper tolerance boundary
			const paramsUpperBound = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee + toleranceRange } // 1100
			};

			await expect(validateBtcSend(paramsUpperBound)).resolves.not.toThrow();

			// Test fee at lower tolerance boundary
			const paramsLowerBound = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee - toleranceRange } // 900
			};

			await expect(validateBtcSend(paramsLowerBound)).resolves.not.toThrow();
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
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(3000n);

			const params = {
				...defaultValidateParams,
				utxosFee: {
					...validUtxosFee,
					feeSatoshis: 1110n, // 370 * 3 = 1110, within tolerance
					utxos: [validUtxo, utxo2]
				}
			};

			await expect(validateBtcSend(params)).resolves.not.toThrow();
		});

		it('should call getFeeRateFromPercentiles with correct parameters', async () => {
			const getFeeRateFromPercentilesSpy = vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles');

			await validateBtcSend(defaultValidateParams);

			expect(getFeeRateFromPercentilesSpy).toHaveBeenCalledWith({
				network: defaultValidateParams.network,
				identity: defaultValidateParams.identity
			});
		});

		it('should validate exact fee tolerance boundaries', async () => {
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(4000n);

			const expectedFee = 250n * 4n; // 1000 satoshis
			const toleranceRange = expectedFee / 10n; // 100 satoshis

			// Test fee just outside tolerance (should fail)
			const paramsOutsideUpper = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee + toleranceRange + 1n } // 1101
			};

			await expect(validateBtcSend(paramsOutsideUpper)).rejects.toThrow(BtcValidationError);

			const paramsOutsideLower = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee - toleranceRange - 1n } // 899
			};

			await expect(validateBtcSend(paramsOutsideLower)).rejects.toThrow(BtcValidationError);

			// Test fee exactly at tolerance boundary (should pass)
			const paramsExactUpper = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee + toleranceRange } // 1100
			};

			await expect(validateBtcSend(paramsExactUpper)).resolves.not.toThrow();
		});
	});
});
