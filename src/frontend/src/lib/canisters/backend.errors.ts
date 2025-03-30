import type {
	AllowSigningError,
	BtcAddPendingTransactionError,
	CreateChallengeError,
	SelectedUtxosFeeError
} from '$declarations/backend/backend.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { mapIcrc2ApproveError, type ApproveError } from '@dfinity/ledger-icp';

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

	return new CanisterInternalError('Unknown BtcSelectUserUtxosFeeError');
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

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	if ('PowChallenge' in err) {
		return new CanisterInternalError('PowChallenge:- ' + JSON.stringify(err.PowChallenge));
	}

	return new CanisterInternalError('Unknown AllowSigningError');
};

export const mapCreateChallengeError = (err: CreateChallengeError): CanisterInternalError => {
	if ('ChallengeInProgress' in err) {
		return new CanisterInternalError('A challenge is already in progress.');
	}

	if ('MissingUserProfile' in err) {
		return new CanisterInternalError('User profile is missing.');
	}

	if ('RandomnessError' in err) {
		return new CanisterInternalError('Randomness error: ' + err.RandomnessError);
	}

	return new CanisterInternalError('Unknown CreateChallengeError');
};
