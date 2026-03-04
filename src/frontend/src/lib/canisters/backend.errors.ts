import type {
	AllowSigningError,
	BtcAddPendingTransactionError,
	GetAllowedCyclesError,
	SelectedUtxosFeeError
} from '$declarations/backend/backend.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { assertNever } from '@dfinity/utils';
import { mapIcrc2ApproveError, type ApproveError } from '@icp-sdk/canisters/ledger/icp';

export const mapBtcPendingTransactionError = (
	err: BtcAddPendingTransactionError
): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}

	return new CanisterInternalError('Unknown BtcAddPendingTransactionError');
};

export const mapBtcSelectUserUtxosFeeError = (
	err: SelectedUtxosFeeError
): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}

	if ('PendingTransactions' in err) {
		return new CanisterInternalError(
			'Selecting utxos fee is not possible - pending transactions found.'
		);
	}

	assertNever(err)

	return new CanisterInternalError('Unknown BtcSelectUserUtxosFeeError');
};

export const mapGetAllowedCyclesError = (err: GetAllowedCyclesError): CanisterInternalError => {
	if ('FailedToContactCyclesLedger' in err) {
		return new CanisterInternalError('The Cycles Ledger cannot be contacted.');
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return new CanisterInternalError('Unknown GetAllowedCyclesError');
};

export const mapAllowSigningError = (
	err: AllowSigningError
): CanisterInternalError | ApproveError => {
	if ('ApproveError' in err) {
		return mapIcrc2ApproveError(err.ApproveError);
	}

	if ('FailedToContactCyclesLedger' in err) {
		return new CanisterInternalError('The Cycles Ledger cannot be contacted.');
	}

	if ('RateLimited' in err) {
		return new CanisterInternalError('Rate limit exceeded. Please try again later.');
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	assertNever(err);

	return new CanisterInternalError('An uknown error occurred.');
};
