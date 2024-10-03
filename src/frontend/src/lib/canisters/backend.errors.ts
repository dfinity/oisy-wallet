import type {
	BtcAddPendingTransactionError,
	SelectedUtxosFeeError
} from '$declarations/backend/backend.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const backendCanisterError = (
	response: BtcAddPendingTransactionError | SelectedUtxosFeeError
) => {
	if ('InternalError' in response) {
		return new CanisterInternalError(response.InternalError.msg);
	}

	if ('PendingTransactions' in response) {
		return new CanisterInternalError('Action is not possible - pending transactions found.');
	}

	return new Error('Unknown BackendError');
};
