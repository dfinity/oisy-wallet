import { BtcPrepareSendError } from '$btc/types/btc-send';
import {
	convertNumberToSatoshis,
	convertSatoshisToBtc,
	isInvalidUtxosFee,
	mapUtxosFeeErrorToMessage
} from '$btc/utils/btc-send.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';

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
		expect(isInvalidUtxosFee({ feeSatoshis: ZERO, utxos: [] })).toBeTruthy();
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
			mapUtxosFeeErrorToMessage({ utxosFee: { feeSatoshis: ZERO, utxos: [] }, i18n: en })
		).toBe(en.send.info.no_available_utxos);
	});
});
