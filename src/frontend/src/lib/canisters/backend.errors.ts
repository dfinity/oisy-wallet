import type {
	BtcAddPendingTransactionError,
	GetAllowedCyclesError,
	SelectedUtxosFeeError
} from '$declarations/backend/backend.did';
import { CanisterInternalError } from '$lib/canisters/errors';

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
