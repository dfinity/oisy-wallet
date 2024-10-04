import type {
	AllowSigningError,
	BtcAddPendingTransactionError,
	SelectedUtxosFeeError
} from '$declarations/backend/backend.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { mapIcrc2ApproveError } from '@dfinity/ledger-icp';

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

export const mapAllowSigningError = (err: AllowSigningError) => {
	if ('ApproveError' in err) {
		return mapIcrc2ApproveError(err.ApproveError);
	}

	if ('FailedToContactCyclesLedger' in err) {
		return new CanisterInternalError('The Cycles Ledger cannot be contacted.');
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return new CanisterInternalError('Unknown AllowSigningError');
};
