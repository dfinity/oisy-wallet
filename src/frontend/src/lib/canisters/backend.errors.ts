import type {
	AllowSigningError,
	BtcAddPendingTransactionError,
	ChallengeCompletionError,
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

export enum ChallengeCompletionErrorEnum {
	InvalidNonce = 'InvalidNonce',
	MissingChallenge = 'MissingChallenge',
	ExpiredChallenge = 'ExpiredChallenge',
	MissingUserProfile = 'MissingUserProfile',
	ChallengeAlreadySolved = 'ChallengeAlreadySolved',
	Unknown = 'Unknown'
}

export enum CreateChallengeEnum {
	ChallengeInProgress = 'ChallengeInProgress',
	Unknown = 'Unknown'
}

export class PowCreateChallengeError extends CanisterInternalError {
	public code: CreateChallengeEnum;

	constructor(message: string, code: CreateChallengeEnum) {
		super(message);
		this.code = code;
	}
}

export class PowChallengeError extends CanisterInternalError {
	public code: ChallengeCompletionErrorEnum;

	constructor(message: string, challengeCompletionError: ChallengeCompletionErrorEnum) {
		super(message);
		this.code = challengeCompletionError;
	}
}

export const mapAllowSigningError = (
	err: AllowSigningError
): CanisterInternalError | ApproveError | ChallengeCompletionError => {
	if ('ApproveError' in err) {
		return mapIcrc2ApproveError(err.ApproveError);
	}

	if ('FailedToContactCyclesLedger' in err) {
		return new CanisterInternalError('The Cycles Ledger cannot be contacted.');
	}

	if ('PowChallenge' in err) {
		const powError = err.PowChallenge;

		// Convert the backend Candid variant type to a strongly typed enum so we can easily handle it
		// when thrown
		if ('InvalidNonce' in powError) {
			return new PowChallengeError(
				'The provided nonce is valid.',
				ChallengeCompletionErrorEnum.InvalidNonce
			);
		}
		if ('MissingChallenge' in powError) {
			return new PowChallengeError(
				'No active challenge found.',
				ChallengeCompletionErrorEnum.MissingChallenge
			);
		}
		if ('ExpiredChallenge' in powError) {
			return new PowChallengeError(
				'The challange was not solved within the given timeframe. Reduce the difficulty or increase the expiary ' +
					'duration to avoid this issue from happening again',
				ChallengeCompletionErrorEnum.ExpiredChallenge
			);
		}
		if ('MissingUserProfile' in powError) {
			return new PowChallengeError(
				'User profile not found. Please create a profile first.',
				ChallengeCompletionErrorEnum.MissingUserProfile
			);
		}
		if ('ChallengeAlreadySolved' in powError) {
			return new PowChallengeError(
				'This challenge has already been solved.',
				ChallengeCompletionErrorEnum.ChallengeAlreadySolved
			);
		}

		// Fallback for any unknown PowChallenge error types
		return new PowChallengeError(
			`Unknown error: ${JSON.stringify(powError)}`,
			ChallengeCompletionErrorEnum.Unknown
		);
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return new CanisterInternalError('An uknown error occurred.');
};

export const mapCreateChallengeError = (err: CreateChallengeError): CanisterInternalError => {
	if ('ChallengeInProgress' in err) {
		return new PowCreateChallengeError(
			'Challenge is already in progress.',
			CreateChallengeEnum.ChallengeInProgress
		);
	}

	if ('MissingUserProfile' in err) {
		return new CanisterInternalError('User profile is missing.');
	}

	if ('RandomnessError' in err) {
		return new CanisterInternalError('Could not generate randomness.');
	}

	if ('Other' in err) {
		return new CanisterInternalError('An other error occurred.');
	}

	return new CanisterInternalError('An uknown error occurred.');
};
