import type {
	AllowSigningError,
	BtcAddPendingTransactionError,
	CreateChallengeError,
	GetAllowedCyclesError,
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

	if ('PowChallenge' in err) {
		const powError = err.PowChallenge;

		// Map specific PowChallenge errors to CanisterInternalError with descriptive messages
		if ('InvalidNonce' in powError) {
			return new CanisterInternalError(
				'PowChallenge error: The proof of work solution is invalid.'
			);
		}
		if ('MissingChallenge' in powError) {
			return new CanisterInternalError('PowChallenge error: No active challenge found.');
		}
		if ('ExpiredChallenge' in powError) {
			return new CanisterInternalError('PowChallenge error: The challenge has expired.');
		}
		if ('MissingUserProfile' in powError) {
			return new CanisterInternalError(
				'PowChallenge error: User profile not found. Please create a profile first.'
			);
		}
		if ('ChallengeAlreadySolved' in powError) {
			return new CanisterInternalError(
				'PowChallenge error: This challenge has already been solved.'
			);
		}

		// Fallback for any unknown PowChallenge error types
		return new CanisterInternalError(`Unknown PoW challenge error: ${JSON.stringify(powError)}`);
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return new CanisterInternalError('Unknown AllowSigningError');
};

export const mapCreateChallengeError = (err: CreateChallengeError): CanisterInternalError => {
	if ('ChallengeInProgress' in err) {
		return new CanisterInternalError('Challenge is already in progress.');
	}

	if ('MissingUserProfile' in err) {
		return new CanisterInternalError('User profile is missing.');
	}

	if ('RandomnessError' in err) {
		return new CanisterInternalError(err.RandomnessError);
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return new CanisterInternalError('Unknown CreateChallengeError');
};
