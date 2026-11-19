import type {
	AllowSigningError,
	BtcAddPendingTransactionError,
	BtcBroadcastTransactionError,
	BtcGetBalanceError,
	BtcGetFeePercentilesError,
	BtcGetPendingTransactionsError,
	BtcGetSpendableUtxosError,
	GetAllowedCyclesError,
	PersonalNoteError,
	RateLimitError,
	SignOnramperWidgetUrlError
} from '$declarations/backend/backend.did';
import {
	BtcBroadcastTransactionCanisterError,
	CanisterInternalError,
	OnramperRateLimitedError,
	OnramperSecretNotConfiguredError,
	PersonalNotesRateLimitedError
} from '$lib/canisters/errors';
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

// Unlike `btc_add_pending_transaction`'s, a rate limit is an error here too: nothing was broadcast,
// so the send failed.
export const mapBtcBroadcastTransactionError = (
	err: BtcBroadcastTransactionError
): BtcBroadcastTransactionCanisterError => {
	if ('RateLimited' in err) {
		return new BtcBroadcastTransactionCanisterError(
			err,
			mapRateLimitError(err.RateLimited).message
		);
	}

	// The other variants are named in the message, with their detail, for the logs.
	const [[variant, detail]] = Object.entries(err) as [[string, unknown]];
	const suffix =
		typeof detail !== 'object' || detail === null
			? ''
			: 'msg' in detail
				? `: ${String(detail.msg)}`
				: 'index' in detail
					? ` (index ${String(detail.index)})`
					: '';

	return new BtcBroadcastTransactionCanisterError(
		err,
		`btc_broadcast_transaction: ${variant}${suffix}`
	);
};

export const mapBtcAddPendingTransactionError = (
	err: BtcAddPendingTransactionError
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

	if ('InvalidDelegationChain' in err) {
		return new CanisterInternalError(
			`II delegation chain verification failed: ${err.InvalidDelegationChain.msg}`
		);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown BtcAddPendingTransactionError'));
};

export const mapBtcGetPendingTransactionsError = (
	err: BtcGetPendingTransactionsError
): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}

	if ('RateLimited' in err) {
		return mapRateLimitError(err.RateLimited);
	}

	if ('InvalidDelegationChain' in err) {
		return new CanisterInternalError(
			`II delegation chain verification failed: ${err.InvalidDelegationChain.msg}`
		);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown BtcGetPendingTransactionsError'));
};

export const mapBtcGetSpendableUtxosError = (
	err: BtcGetSpendableUtxosError
): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}

	if ('RateLimited' in err) {
		return mapRateLimitError(err.RateLimited);
	}

	if ('InvalidDelegationChain' in err) {
		return new CanisterInternalError(
			`II delegation chain verification failed: ${err.InvalidDelegationChain.msg}`
		);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown BtcGetSpendableUtxosError'));
};

export const mapBtcGetBalanceError = (err: BtcGetBalanceError): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}

	if ('BalanceUnavailable' in err) {
		return new CanisterInternalError(`Bitcoin balance unavailable: ${err.BalanceUnavailable.msg}`);
	}

	if ('RateLimited' in err) {
		return mapRateLimitError(err.RateLimited);
	}

	if ('InvalidDelegationChain' in err) {
		return new CanisterInternalError(
			`II delegation chain verification failed: ${err.InvalidDelegationChain.msg}`
		);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown BtcGetBalanceError'));
};

export const mapBtcGetFeePercentilesError = (
	err: BtcGetFeePercentilesError
): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown BtcGetFeePercentilesError'));
};

export const mapGetAllowedCyclesError = (err: GetAllowedCyclesError): CanisterInternalError => {
	if ('FailedToContactCyclesLedger' in err) {
		return new CanisterInternalError('The Cycles Ledger cannot be contacted.');
	}

	if ('RateLimited' in err) {
		return mapRateLimitError(err.RateLimited);
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

	if ('InvalidDelegationChain' in err) {
		return new CanisterInternalError(
			`II delegation chain verification failed: ${err.InvalidDelegationChain.msg}`
		);
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown AllowSigningError'));
};

export const mapSignOnramperWidgetUrlError = (
	err: SignOnramperWidgetUrlError
): CanisterInternalError => {
	if ('SecretNotConfigured' in err) {
		return new OnramperSecretNotConfiguredError(
			'OnRamper signing secret is not configured on the backend canister.'
		);
	}

	if ('RateLimited' in err) {
		const { max_calls: maxCalls, window_ns: windowNs } = err.RateLimited;
		const windowSeconds = windowNs / NANO_SECONDS_IN_SECOND;

		return new OnramperRateLimitedError(
			`Rate limit exceeded. Maximum of ${maxCalls} calls allowed every ${windowSeconds} seconds.`
		);
	}

	if ('AddressMismatch' in err) {
		return new CanisterInternalError(
			'A wallet address did not match the one derived for the caller on the backend.'
		);
	}

	if ('AddressDerivationFailed' in err) {
		return new CanisterInternalError(
			'Could not derive the wallet addresses to verify the OnRamper widget URL.'
		);
	}

	return assertNeverOr(err, new CanisterInternalError('Unknown SignOnramperWidgetUrlError'));
};

export const mapPersonalNotesVetkeyError = (err: PersonalNoteError): CanisterInternalError => {
	if ('RateLimited' in err) {
		const { max_calls: maxCalls, window_ns: windowNs } = err.RateLimited;
		const windowSeconds = windowNs / NANO_SECONDS_IN_SECOND;

		return new PersonalNotesRateLimitedError(
			`Rate limit exceeded. Maximum of ${maxCalls} calls allowed every ${windowSeconds} seconds.`
		);
	}

	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}

	// The remaining PersonalNoteError variants (note size / count / id) are not
	// reachable from the vetKey endpoints; surface them as a generic failure.
	return new CanisterInternalError('The personal-notes vetKey could not be retrieved.');
};
