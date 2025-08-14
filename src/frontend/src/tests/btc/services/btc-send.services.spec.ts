import { sendBtc, type SendBtcParams, validateUtxosForSend } from '$btc/services/btc-send.services';
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
import { hexStringToUint8Array, toNullable } from '@dfinity/utils';

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
			feeSatoshis: 1000n,
			utxos: [validUtxo]
		};

		const defaultValidateParams = {
			utxosFee: validUtxosFee,
			source: 'bc1qt0nkp96r7p95xfacyp98pww2eu64yzuf78l4a2wy0sttt83hux4q6u2nl7',
			amount: 0.0001,
			feeRateSatoshisPerVByte: 2n
		};

		beforeEach(() => {
			// Mock utility functions with default values
			vi.spyOn(btcUtils, 'getPendingTransactionIds').mockReturnValue([]);
			vi.spyOn(btcUtxosUtils, 'extractUtxoTxIds').mockReturnValue(['txid1', 'txid2']);
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);
		});

		it('should pass validation for valid UTXOs and parameters', () => {
			expect(() => validateUtxosForSend(defaultValidateParams)).not.toThrow();
		});

		it('should throw InsufficientBalance error when UTXOs array is empty', () => {
			const params = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, utxos: [] }
			};

			expect(() => validateUtxosForSend(params)).toThrow(BtcValidationError);
			expect(() => validateUtxosForSend(params)).toThrow('No UTXOs provided');

			try {
				validateUtxosForSend(params);
			} catch (error) {
				expect(error).toBeInstanceOf(BtcValidationError);
				expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InsufficientBalance);
			}
		});

		describe('InvalidUtxoData validation', () => {
			it('should throw InvalidUtxoData error when UTXO has no txid', () => {
				const invalidUtxo = {
					...validUtxo,
					outpoint: { ...validUtxo.outpoint, txid: undefined as unknown as number[] }
				};
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				expect(() => validateUtxosForSend(params)).toThrow(BtcValidationError);
				expect(() => validateUtxosForSend(params)).toThrow('Invalid UTXO data structure or values');

				try {
					validateUtxosForSend(params);
				} catch (error) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO has undefined vout', () => {
				const invalidUtxo = {
					...validUtxo,
					outpoint: { ...validUtxo.outpoint, vout: undefined as unknown as number }
				};
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				expect(() => validateUtxosForSend(params)).toThrow(BtcValidationError);

				try {
					validateUtxosForSend(params);
				} catch (error) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO has zero or negative value', () => {
				const invalidUtxo = { ...validUtxo, value: 0n };
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				expect(() => validateUtxosForSend(params)).toThrow(BtcValidationError);

				try {
					validateUtxosForSend(params);
				} catch (error) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when UTXO has negative height', () => {
				const invalidUtxo = { ...validUtxo, height: -1 };
				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [invalidUtxo] }
				};

				expect(() => validateUtxosForSend(params)).toThrow(BtcValidationError);

				try {
					validateUtxosForSend(params);
				} catch (error) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
				}
			});

			it('should throw InvalidUtxoData error when total UTXO value is zero', () => {
				// Test the total value check by mocking a scenario where individual validation passes but total is zero
				const mockUtxo = { ...validUtxo, value: 1n };
				vi.spyOn(Array.prototype, 'reduce').mockReturnValueOnce(0n);

				const paramsWithMockUtxo = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, utxos: [mockUtxo] }
				};

				expect(() => validateUtxosForSend(paramsWithMockUtxo)).toThrow(BtcValidationError);

				try {
					validateUtxosForSend(paramsWithMockUtxo);
				} catch (error: unknown) {
					expect((error as BtcValidationError).type).toBe(BtcSendValidationError.InvalidUtxoData);
					expect((error as Error).message).toContain('Total UTXO value is zero or negative');
				}
			});
		});

		it('should throw UtxoLocked error when UTXO is in pending transactions', () => {
			vi.spyOn(btcUtils, 'getPendingTransactionIds').mockReturnValue(['txid1']);
			vi.spyOn(btcUtxosUtils, 'extractUtxoTxIds').mockReturnValue(['txid1']);

			expect(() => validateUtxosForSend(defaultValidateParams)).toThrow(BtcValidationError);
			expect(() => validateUtxosForSend(defaultValidateParams)).toThrow(
				'locked by a pending transaction'
			);

			try {
				validateUtxosForSend(defaultValidateParams);
			} catch (error: unknown) {
				expect((error as BtcValidationError).type).toBe(BtcSendValidationError.UtxoLocked);
			}
		});

		describe('InvalidFeeCalculation validation', () => {
			it('should throw InvalidFeeCalculation error when fee is too low', () => {
				// Mock estimated transaction size to make expected fee higher than provided fee
				vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(1000);

				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, feeSatoshis: 100n }, // Very low fee
					feeRateSatoshisPerVByte: 10n
				};

				expect(() => validateUtxosForSend(params)).toThrow(BtcValidationError);
				expect(() => validateUtxosForSend(params)).toThrow('Fee validation failed');

				try {
					validateUtxosForSend(params);
				} catch (error: unknown) {
					expect((error as BtcValidationError).type).toBe(
						BtcSendValidationError.InvalidFeeCalculation
					);
				}
			});

			it('should throw InvalidFeeCalculation error when fee is too high', () => {
				// Mock estimated transaction size to make expected fee much lower than provided fee
				vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(100);

				const params = {
					...defaultValidateParams,
					utxosFee: { ...validUtxosFee, feeSatoshis: 50000n }, // Very high fee
					feeRateSatoshisPerVByte: 1n
				};

				expect(() => validateUtxosForSend(params)).toThrow(BtcValidationError);

				try {
					validateUtxosForSend(params);
				} catch (error: unknown) {
					expect((error as BtcValidationError).type).toBe(
						BtcSendValidationError.InvalidFeeCalculation
					);
				}
			});
		});

		it('should throw InsufficientBalanceForFee error when UTXOs have insufficient funds', () => {
			const params = {
				...defaultValidateParams,
				amount: 1, // 1 BTC = 100,000,000 satoshis, but UTXO only has 100,000
				utxosFee: { ...validUtxosFee, feeSatoshis: 1000n }
			};

			expect(() => validateUtxosForSend(params)).toThrow(BtcValidationError);
			expect(() => validateUtxosForSend(params)).toThrow('Insufficient funds');

			try {
				validateUtxosForSend(params);
			} catch (error: unknown) {
				expect((error as BtcValidationError).type).toBe(
					BtcSendValidationError.InsufficientBalanceForFee
				);
			}
		});

		it('should accept fee within tolerance range', () => {
			// Mock transaction size for predictable fee calculation
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);

			const expectedFee = BigInt(250) * 2n; // 500 satoshis
			const toleranceRange = expectedFee / 10n; // 50 satoshis

			// Test fee at upper tolerance boundary
			const paramsUpperBound = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee + toleranceRange }
			};

			expect(() => validateUtxosForSend(paramsUpperBound)).not.toThrow();

			// Test fee at lower tolerance boundary
			const paramsLowerBound = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee - toleranceRange }
			};

			expect(() => validateUtxosForSend(paramsLowerBound)).not.toThrow();
		});

		it('should handle multiple UTXOs correctly', () => {
			const utxo2: Utxo = {
				height: 200,
				value: 50000n,
				outpoint: {
					txid: [6, 7, 8, 9, 10],
					vout: 1
				}
			};

			const params = {
				...defaultValidateParams,
				utxosFee: {
					...validUtxosFee,
					utxos: [validUtxo, utxo2]
				}
			};

			// Mock the transaction size estimation for 2 inputs
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(370);

			expect(() => validateUtxosForSend(params)).not.toThrow();
		});

		it('should use default fee rate when not provided', () => {
			const params = {
				utxosFee: validUtxosFee,
				source: defaultValidateParams.source,
				amount: defaultValidateParams.amount
				// feeRateSatoshisPerVByte not provided, should default to 1n
			};

			// Mock for lower fee rate expectation
			vi.spyOn(btcUtxosUtils, 'estimateTransactionSize').mockReturnValue(250);

			expect(() => validateUtxosForSend(params)).not.toThrow();
		});
	});
});
