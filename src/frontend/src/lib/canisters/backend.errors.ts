import type {
	AllowSigningError,
	BtcAddPendingTransactionError,
	BtcGetPendingTransactionsError,
	GetAllowedCyclesError,
	RateLimitError,
	SelectedUtxosFeeError
} from '$declarations/backend/backend.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
import { assertNever } from '@dfinity/utils';
import { mapIcrc2ApproveError, type ApproveError } from '@icp-sdk/canisters/ledger/icp';

// eslint-disable-next-line local-rules/prefer-object-params -- this util is more meaningful with separate parameters instead of an object
const assertNeverOr = <T>(value: never, fallback: T): T => {
	try {
		assertNever(value);
	} catch {
		// If a new/untracked variant arrives at runtime, assertNever will throw.
		// We deliberately return the fallback instead of crashing.
	}

	return fallback;
};

const mapRateLimitError = (err: RateLimitError): CanisterInternalError => {
	const { max_calls: maxCalls, window_ns: windowNs } = err;

	const windowSeconds = windowNs / NANO_SECONDS_IN_SECOND;

	return new CanisterInternalError(
		`Rate limit exceeded. Maximum of ${maxCalls} calls allowed every ${windowSeconds} seconds.`
	);
};

export const mapBtcPendingTransactionError = (
	err: BtcAddPendingTransactionError | BtcGetPendingTransactionsError
): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}

	if ('InvalidUtxos' in err) {
		return new CanisterInternalError('The provided UTXOs are invalid.');
	}

	if ('EmptyUtxos' in err) {
		return new CanisterInternalError('No UTXOs provided.');
	}

	if ('DuplicateUtxos' in err) {
		return new CanisterInternalError('Duplicate UTXOs provided.');
	}

	if ('UtxosAlreadyReserved' in err) {
		return new CanisterInternalError('Some of the provided UTXOs are already reserved.');
	}

	if ('RateLimited' in err) {
		return mapRateLimitError(err.RateLimited);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown BtcPendingTransactionError'));
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

	if ('RateLimited' in err) {
		return mapRateLimitError(err.RateLimited);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown BtcSelectUserUtxosFeeError'));
};

export const mapGetAllowedCyclesError = (err: GetAllowedCyclesError): CanisterInternalError => {
	if ('FailedToContactCyclesLedger' in err) {
		return new CanisterInternalError('The Cycles Ledger cannot be contacted.');
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown GetAllowedCyclesError'));
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
		return mapRateLimitError(err.RateLimited);
	}

	if ('RateLimitedByGuard' in err) {
		const { max_calls: maxCalls, window_ns: windowNs } = err.RateLimitedByGuard;

		const windowSeconds = windowNs / NANO_SECONDS_IN_SECOND;

		return new CanisterInternalError(
			`Guard rate limit exceeded. Maximum of ${maxCalls} calls allowed every ${windowSeconds} seconds.`
		);
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown AllowSigningError'));
};
