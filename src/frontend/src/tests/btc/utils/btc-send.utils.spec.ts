import { BtcBroadcastUnconfirmedError, BtcPrepareSendError } from '$btc/types/btc-send';
import {
	convertNumberToSatoshis,
	convertSatoshisToBtc,
	isBtcSendLimitError,
	isDefinitiveBtcBroadcastRefusal,
	isInvalidUtxosFee,
	isUnclearBtcBroadcastOutcome,
	mapBtcBroadcastErrorToMessage,
	mapUtxosFeeErrorToMessage
} from '$btc/utils/btc-send.utils';
import type { BtcBroadcastTransactionError } from '$declarations/backend/backend.did';
import type { PaymentError } from '$declarations/signer/signer.did';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import { ZERO } from '$lib/constants/app.constants';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';

describe('convertNumberToSatoshis', () => {
	it('converts number to Satoshis correctly', () => {
		expect(convertNumberToSatoshis({ amount: 1 })).toEqual(100000000n);
		expect(convertNumberToSatoshis({ amount: 0.00005 })).toEqual(5000n);
		expect(convertNumberToSatoshis({ amount: 0.25 })).toEqual(25000000n);
		expect(convertNumberToSatoshis({ amount: 0 })).toEqual(ZERO);
		expect(convertNumberToSatoshis({ amount: 0.00004 })).toEqual(4000n);
		expect(convertNumberToSatoshis({ amount: 0.00000001 })).toEqual(1n);
		expect(convertNumberToSatoshis({ amount: 0.0000399999999999999 })).toEqual(4000n);
	});
});

describe('convertSatoshisToBtc', () => {
	it('converts Satoshis to BTC correctly', () => {
		expect(convertSatoshisToBtc(100000000n)).toEqual('1');
		expect(convertSatoshisToBtc(5000n)).toEqual('0.00005');
		expect(convertSatoshisToBtc(25000000n)).toEqual('0.25');
		expect(convertSatoshisToBtc(ZERO)).toEqual('0');
		expect(convertSatoshisToBtc(4000n)).toEqual('0.00004');
		expect(convertSatoshisToBtc(1n)).toEqual('0.00000001');
	});
});

describe('isInvalidUtxosFee', () => {
	it('returns false for a usable UTXO selection', () => {
		expect(isInvalidUtxosFee(mockUtxosFee)).toBeFalsy();
	});

	it('returns true when the selection reported an error', () => {
		expect(
			isInvalidUtxosFee({ ...mockUtxosFee, error: BtcPrepareSendError.InsufficientBalance })
		).toBeTruthy();
	});

	it('returns true when no UTXOs were selected', () => {
		expect(
			isInvalidUtxosFee({ feeSatoshis: ZERO, feeRateMiliSatoshisPerVByte: 4000n, utxos: [] })
		).toBeTruthy();
	});
});

describe('mapUtxosFeeErrorToMessage', () => {
	it.each([
		{
			error: BtcPrepareSendError.InsufficientBalance,
			expected: en.send.assertion.insufficient_funds_verbose_btc
		},
		{
			error: BtcPrepareSendError.InsufficientBalanceForFee,
			expected: en.fee.assertion.insufficient_funds_for_fee
		},
		{
			error: BtcPrepareSendError.MinimumBalance,
			expected: en.send.assertion.minimum_btc_amount
		},
		{
			error: BtcPrepareSendError.UtxoLocked,
			expected: en.send.assertion.btc_utxo_locked
		},
		{
			error: BtcPrepareSendError.PendingTransactionsNotAvailable,
			expected: en.send.assertion.pending_transactions_not_available
		}
	])('maps $error to its message', ({ error, expected }) => {
		expect(mapUtxosFeeErrorToMessage({ utxosFee: { ...mockUtxosFee, error }, i18n: en })).toBe(
			expected
		);
	});

	it('falls back to the no-available-UTXOs message', () => {
		expect(
			mapUtxosFeeErrorToMessage({
				utxosFee: { feeSatoshis: ZERO, feeRateMiliSatoshisPerVByte: 4000n, utxos: [] },
				i18n: en
			})
		).toBe(en.send.info.no_available_utxos);
	});
});

describe('BTC broadcast outcomes', () => {
	const answer = (variant: BtcBroadcastTransactionError) =>
		new BtcBroadcastTransactionCanisterError(variant, 'test');

	const open: BtcBroadcastTransactionError[] = [
		{ BroadcastOutcomeUnknown: { msg: 'trap' } },
		{ BroadcastInProgress: null }
	];

	const locked: BtcBroadcastTransactionError[] = [
		{ UtxosAlreadyReserved: null },
		{ InvalidUtxos: null }
	];

	// One per tier of the backend's limiter: a minute, an hour and a day.
	const rateLimited: { variant: BtcBroadcastTransactionError; wait: string }[] = [
		{
			variant: { RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal } },
			wait: '1 minute'
		},
		{
			variant: {
				RateLimited: { max_calls: 20, window_ns: 3_600_000_000_000n, caller: mockPrincipal }
			},
			wait: '1 hour'
		},
		{
			variant: {
				RateLimited: { max_calls: 50, window_ns: 86_400_000_000_000n, caller: mockPrincipal }
			},
			wait: '1 day'
		}
	];

	const refusedOtherwise: BtcBroadcastTransactionError[] = [
		{ InvalidDelegationChain: { msg: 'expired' } },
		{ MalformedTransaction: null },
		{ TransactionTooLarge: null },
		{ TooManyInputs: null },
		{ TooManyOutputs: null },
		{ DuplicateInputs: null },
		{ InvalidOutput: { index: 1 } },
		{ UnsupportedLockTime: null },
		{ InvalidInput: { index: 0 } },
		{ InvalidSignature: { index: 0 } },
		{ FeeTooLow: null },
		{ BroadcastRejected: { msg: 'send_transaction failed' } },
		{ InternalError: { msg: 'boom' } }
	];

	it('should cover every variant of the backend answer', () => {
		expect(open.length + locked.length + 1 + refusedOtherwise.length).toBe(18);
	});

	describe.each(open)('the open answer %o', (variant) => {
		it('should be unclear, and no refusal', () => {
			expect(isUnclearBtcBroadcastOutcome(answer(variant))).toBeTruthy();
			expect(isDefinitiveBtcBroadcastRefusal(answer(variant))).toBeFalsy();
		});

		it('should say the transaction may have been sent', () => {
			expect(mapBtcBroadcastErrorToMessage({ err: answer(variant), i18n: en })).toBe(
				en.send.error.btc_transaction_unconfirmed
			);
		});
	});

	describe.each([...locked, rateLimited[0].variant, ...refusedOtherwise])(
		'the refusal %o',
		(variant) => {
			it('should be a definitive refusal, and not unclear', () => {
				expect(isDefinitiveBtcBroadcastRefusal(answer(variant))).toBeTruthy();
				expect(isUnclearBtcBroadcastOutcome(answer(variant))).toBeFalsy();
			});
		}
	);

	it.each(rateLimited)(
		'should say to wait $wait after a rate limit, and count it as a limit',
		({ variant, wait }) => {
			expect(mapBtcBroadcastErrorToMessage({ err: answer(variant), i18n: en })).toBe(
				en.send.error.btc_send_rate_limited.replace('$duration', wait)
			);
			expect(isBtcSendLimitError(answer(variant))).toBeTruthy();
		}
	);

	it.each(locked)('should say the funds are locked for %o', (variant) => {
		expect(mapBtcBroadcastErrorToMessage({ err: answer(variant), i18n: en })).toBe(
			en.send.assertion.btc_utxo_locked
		);
	});

	it.each(refusedOtherwise)('should leave the message to the caller for %o', (variant) => {
		expect(mapBtcBroadcastErrorToMessage({ err: answer(variant), i18n: en })).toBeUndefined();
	});

	it.each([...open, ...locked, ...refusedOtherwise])(
		'should not count %o as a limit',
		(variant) => {
			expect(isBtcSendLimitError(answer(variant))).toBeFalsy();
		}
	);

	it('should read a broadcast with no typed answer as unclear', () => {
		const err = new BtcBroadcastUnconfirmedError({ cause: new Error('timeout') });

		expect(isUnclearBtcBroadcastOutcome(err)).toBeTruthy();
		expect(isDefinitiveBtcBroadcastRefusal(err)).toBeFalsy();
		expect(isBtcSendLimitError(err)).toBeFalsy();
		expect(mapBtcBroadcastErrorToMessage({ err, i18n: en })).toBe(
			en.send.error.btc_transaction_unconfirmed
		);
	});

	// An error from before the broadcast, such as a signing failure: nothing went out, but it is no
	// answer of the backend's either.
	it('should read any other error as neither', () => {
		const err = new Error('signing failed');

		expect(isUnclearBtcBroadcastOutcome(err)).toBeFalsy();
		expect(isDefinitiveBtcBroadcastRefusal(err)).toBeFalsy();
		expect(mapBtcBroadcastErrorToMessage({ err, i18n: en })).toBeUndefined();
	});
});

describe('BTC signing payment errors', () => {
	const ledger = mockPrincipal;

	it('should tell a spent signing approval to sign in again, and count it as a limit', () => {
		const err = new SignerCanisterPaymentError({
			LedgerWithdrawFromError: { ledger, error: { InsufficientAllowance: { allowance: 10n } } }
		});

		expect(mapBtcBroadcastErrorToMessage({ err, i18n: en })).toBe(
			en.send.error.btc_signing_allowance_spent
		);
		expect(isBtcSendLimitError(err)).toBeTruthy();
	});

	// The backend's own cycles running low, or any other payment failure: a sign-in does not fix it.
	it.each<PaymentError>([
		{ LedgerWithdrawFromError: { ledger, error: { InsufficientFunds: { balance: 10n } } } },
		{ LedgerWithdrawFromError: { ledger, error: { TemporarilyUnavailable: null } } },
		{ InsufficientFunds: { needed: 20n, available: 10n } },
		{ UnsupportedPaymentType: null }
	])('should leave %o to the caller', (paymentError) => {
		const err = new SignerCanisterPaymentError(paymentError);

		expect(mapBtcBroadcastErrorToMessage({ err, i18n: en })).toBeUndefined();
		expect(isBtcSendLimitError(err)).toBeFalsy();
	});
});
