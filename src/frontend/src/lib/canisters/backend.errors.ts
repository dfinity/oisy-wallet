import type {
	BtcAddPendingTransactionError,
	SelectedUtxosFeeError
} from '$declarations/backend/backend.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapBtcPendingTransactionError = (response: BtcAddPendingTransactionError) => {
	if ('InternalError' in response) {
		return new CanisterInternalError(response.InternalError.msg);
	}

	return new CanisterInternalError('Unknown BtcAddPendingTransactionError');
};

export const mapBtcSelectUserUtxosFeeError = (response: SelectedUtxosFeeError) => {
	if ('InternalError' in response) {
		return new CanisterInternalError(response.InternalError.msg);
	}

	if ('PendingTransactions' in response) {
		return new CanisterInternalError(
			'Selecting utxos fee is not possible - pending transactions found.'
		);
	}

	return new CanisterInternalError('Unknown BtcSelectUserUtxosFeeError');
};
