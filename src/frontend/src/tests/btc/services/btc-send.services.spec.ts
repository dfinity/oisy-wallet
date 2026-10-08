import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import {
	handleBtcValidationError,
	sendBtc,
	validateBtcSend,
	type SendBtcParams
} from '$btc/services/btc-send.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { BtcSendValidationError, BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import * as btcUtxosUtils from '$btc/utils/btc-utxos.utils';
import * as btcUtils from '$icp/utils/btc.utils';
import * as backendAPI from '$lib/api/backend.api';
import * as signerAPI from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

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

	describe('handleBtcValidationError', () => {
		let spyToastsError: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();
			spyToastsError = vi.spyOn(toastsStore, 'toastsError').mockReturnValue(Symbol('toast'));
		});

		it('should not toast for AuthenticationRequired', () => {
			handleBtcValidationError({
				err: new BtcValidationError(BtcSendValidationError.AuthenticationRequired)
			});

			expect(spyToastsError).not.toHaveBeenCalled();
		});

		it.each([
			{ type: BtcSendValidationError.NoNetworkId, text: get(i18n).send.error.no_btc_network_id },
			{
				type: BtcSendValidationError.InvalidDestination,
				text: get(i18n).send.assertion.destination_address_invalid
			},
			{ type: BtcSendValidationError.InvalidAmount, text: get(i18n).send.assertion.amount_invalid },
			{
				type: BtcSendValidationError.UtxoFeeMissing,
				text: get(i18n).send.assertion.utxos_fee_missing
			},
			{
				type: BtcSendValidationError.TokenUndefined,
				text: get(i18n).tokens.error.unexpected_undefined
			},
			{
				type: BtcSendValidationError.InsufficientBalance,
				text: get(i18n).send.assertion.btc_insufficient_balance
			},
			{
				type: BtcSendValidationError.InsufficientBalanceForFee,
				text: get(i18n).send.assertion.btc_insufficient_balance_for_fee
			},
			{
				type: BtcSendValidationError.InvalidUtxoData,
				text: get(i18n).send.assertion.btc_invalid_utxo_data
			},
			{ type: BtcSendValidationError.UtxoLocked, text: get(i18n).send.assertion.btc_utxo_locked },
			{
				type: BtcSendValidationError.InvalidFeeCalculation,
				text: get(i18n).send.assertion.btc_invalid_fee_calculation
			},
			{
				type: BtcSendValidationError.MinimumBalance,
				text: get(i18n).send.assertion.minimum_btc_amount
			}
		])('should toast the mapped message for $type', ({ type, text }) => {
			handleBtcValidationError({ err: new BtcValidationError(type) });

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text }
			});
		});

		it.each([
			BtcSendValidationError.PendingTransactionsNotAvailable,
			'unknown_error_type' as BtcSendValidationError
		])('should toast the unexpected error with err for %s', (type) => {
			const err = new BtcValidationError(type);

			handleBtcValidationError({ err });

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).send.error.unexpected },
				err
			});
		});
	});

	describe('sendBtc', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call all required functions', async () => {
			const addPendingBtcTransactionSpy = vi
				.spyOn(backendAPI, 'addPendingBtcTransaction')
				.mockResolvedValue({ response: true });
			const sendBtcApiSpy = vi.spyOn(signerAPI, 'sendBtc').mockResolvedValue({ txid });
			const txidStringToUint8ArraySpy = vi
				.spyOn(btcUtils, 'txidStringToUint8Array')
				.mockReturnValue(new Uint8Array());
			const onProgressSpy = vi.spyOn(defaultParams, 'onProgress');

			const result = await sendBtc(defaultParams);

			expect(result).toBe(txid);

			expect(onProgressSpy).toHaveBeenCalled();

			expect(sendBtcApiSpy).toHaveBeenCalledExactlyOnceWith({
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

			expect(addPendingBtcTransactionSpy).toHaveBeenCalledExactlyOnceWith({
				identity: defaultParams.identity,
				network: mapToSignerBitcoinNetwork({ network: defaultParams.network }),
				txId: new Uint8Array(),
				utxos: defaultParams.utxosFee.utxos,
				iiDelegationChain: []
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

		it('should hand the txid over on broadcast, before the pending-transaction bookkeeping', async () => {
			const addPendingBtcTransactionSpy = vi
				.spyOn(backendAPI, 'addPendingBtcTransaction')
				.mockResolvedValue({ response: true });
			vi.spyOn(signerAPI, 'sendBtc').mockResolvedValue({ txid });

			const onBroadcast = vi.fn(() => {
				expect(addPendingBtcTransactionSpy).not.toHaveBeenCalled();
			});

			await sendBtc({ ...defaultParams, onBroadcast });

			expect(onBroadcast).toHaveBeenCalledExactlyOnceWith({ txid });
			expect(addPendingBtcTransactionSpy).toHaveBeenCalledOnce();
		});

		// The bookkeeping protects this flow's own invariants — the spent UTXOs are
		// recorded as pending — so a failing callback must not derail it.
		it('should not let a throwing onBroadcast skip the bookkeeping', async () => {
			const addPendingBtcTransactionSpy = vi
				.spyOn(backendAPI, 'addPendingBtcTransaction')
				.mockResolvedValue({ response: true });
			vi.spyOn(signerAPI, 'sendBtc').mockResolvedValue({ txid });

			const result = await sendBtc({
				...defaultParams,
				onBroadcast: () => {
					throw error;
				}
			});

			expect(result).toBe(txid);
			expect(addPendingBtcTransactionSpy).toHaveBeenCalledOnce();
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
		const validUtxo: CkBtcMinterDid.Utxo = {
			height: 100,
			value: 100000n,
			outpoint: {
				txid: Uint8Array.from([1, 2, 3, 4, 5]),
				vout: 0
			}
		};

		// 1 input + 2 outputs = 141 vB, at 4 sat/vByte = 564 satoshis.
		const validUtxosFee: UtxosFee = {
			feeSatoshis: 564n,
			feeRateMiliSatoshisPerVByte: 4000n,
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
			vi.spyOn(btcUtils, 'getPendingTransactionUtxoOutpoints').mockReturnValue([]);
			vi.spyOn(btcUtxosUtils, 'extractUtxoOutpoints').mockReturnValue(['txid1:0', 'txid2:0']);
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
					outpoint: { ...validUtxo.outpoint, txid: Uint8Array.from([]) }
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
				const invalidUtxo = { ...validUtxo, value: ZERO };
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

		it('should throw UtxoLocked error when a UTXO outpoint is reserved by a pending tx', async () => {
			vi.spyOn(btcUtils, 'getPendingTransactionUtxoOutpoints').mockReturnValue(['txid1:0']);
			vi.spyOn(btcUtxosUtils, 'extractUtxoOutpoints').mockReturnValue(['txid1:0']);

			await expect(validateBtcSend(defaultValidateParams)).rejects.toThrow(BtcValidationError);

			try {
				await validateBtcSend(defaultValidateParams);
			} catch (error: unknown) {
				expect((error as BtcValidationError).type).toBe(BtcSendValidationError.UtxoLocked);
			}
		});

		it('should not throw UtxoLocked when a reserved outpoint shares a txid but differs in vout', async () => {
			// A previous send reserved (txid1, vout=0); the new selection picks (txid1, vout=1)
			// — that is a different outpoint and must remain spendable.
			vi.spyOn(btcUtils, 'getPendingTransactionUtxoOutpoints').mockReturnValue(['txid1:0']);
			vi.spyOn(btcUtxosUtils, 'extractUtxoOutpoints').mockReturnValue(['txid1:1']);

			await expect(validateBtcSend(defaultValidateParams)).resolves.not.toThrow();
		});

		describe('InvalidFeeCalculation validation', () => {
			it('should throw InvalidFeeCalculation error when fee is too low', async () => {
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
			const params = {
				...defaultValidateParams,
				amount: 1, // 1 BTC = 100,000,000 satoshis, but UTXO only has 100,000
				// 141 vB at 1 sat/vByte = 141 satoshis, a valid fee for this selection
				utxosFee: {
					...validUtxosFee,
					feeSatoshis: 141n,
					feeRateMiliSatoshisPerVByte: 1000n
				}
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
			const expectedFee = 564n;
			const toleranceRange = expectedFee / 10n; // 56 satoshis

			// Test fee at upper tolerance boundary
			const paramsUpperBound = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee + toleranceRange } // 620
			};

			await expect(validateBtcSend(paramsUpperBound)).resolves.not.toThrow();

			// Test fee at lower tolerance boundary
			const paramsLowerBound = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee - toleranceRange } // 508
			};

			await expect(validateBtcSend(paramsLowerBound)).resolves.not.toThrow();
		});

		it('should handle multiple UTXOs correctly', async () => {
			const utxo2: CkBtcMinterDid.Utxo = {
				height: 200,
				value: 50000n,
				outpoint: {
					txid: Uint8Array.from([6, 7, 8, 9, 10]),
					vout: 1
				}
			};

			const params = {
				...defaultValidateParams,
				utxosFee: {
					...validUtxosFee,
					// 2 inputs + 2 outputs = 209 vB, at 3 sat/vByte = 627 satoshis
					feeSatoshis: 627n,
					feeRateMiliSatoshisPerVByte: 3000n,
					utxos: [validUtxo, utxo2]
				}
			};

			await expect(validateBtcSend(params)).resolves.not.toThrow();
		});

		it('should not re-sample the fee rate', async () => {
			const getFeeRateFromPercentilesSpy = vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles');

			await validateBtcSend(defaultValidateParams);

			expect(getFeeRateFromPercentilesSpy).not.toHaveBeenCalled();
		});

		it('should accept a fee the mempool has since moved away from', async () => {
			// The percentile median that priced this fee shifts within a minute of ordinary
			// mempool movement, and near the 1 sat/vByte floor one slot of drift already
			// exceeds the tolerance. The fee is judged against the rate it was quoted at, so
			// the send survives the drift instead of failing on the confirmation step.
			vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);

			const params = {
				...defaultValidateParams,
				utxosFee: {
					...validUtxosFee,
					feeSatoshis: 181n,
					feeRateMiliSatoshisPerVByte: 1284n
				}
			};

			await expect(validateBtcSend(params)).resolves.not.toThrow();
		});

		it('should validate exact fee tolerance boundaries', async () => {
			const expectedFee = 564n;
			const toleranceRange = expectedFee / 10n; // 56 satoshis

			// Test fee just outside tolerance (should fail)
			const paramsOutsideUpper = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee + toleranceRange + 1n } // 621
			};

			await expect(validateBtcSend(paramsOutsideUpper)).rejects.toThrow(BtcValidationError);

			const paramsOutsideLower = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee - toleranceRange - 1n } // 507
			};

			await expect(validateBtcSend(paramsOutsideLower)).rejects.toThrow(BtcValidationError);

			// Test fee exactly at tolerance boundary (should pass)
			const paramsExactUpper = {
				...defaultValidateParams,
				utxosFee: { ...validUtxosFee, feeSatoshis: expectedFee + toleranceRange } // 620
			};

			await expect(validateBtcSend(paramsExactUpper)).resolves.not.toThrow();
		});
	});
});
