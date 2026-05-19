import type { TransferError } from '$declarations/icrc7/icrc7.did';
import { CanisterInternalError } from '$lib/canisters/errors';

// Maps an ICRC-7 `TransferError` variant to a human-readable `CanisterInternalError`.
// Reference: https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7/ICRC-7.md#icrc7_transfer
//
// `bigint` fields are interpolated via template literals (which call `.toString()`); we
// intentionally avoid `JSON.stringify` here because it throws `TypeError` on `bigint`.
export const mapIcrc7TransferError = (err: TransferError): CanisterInternalError => {
	if ('NonExistingTokenId' in err) {
		return new CanisterInternalError('NFT token id does not exist');
	}

	if ('InvalidRecipient' in err) {
		return new CanisterInternalError('Invalid recipient for the NFT transfer');
	}

	if ('Unauthorized' in err) {
		return new CanisterInternalError('Unauthorized to transfer this NFT');
	}

	if ('TooOld' in err) {
		return new CanisterInternalError('The transfer is too old');
	}

	if ('CreatedInFuture' in err) {
		return new CanisterInternalError(
			`Transfer created in the future (ledger time: ${err.CreatedInFuture.ledger_time})`
		);
	}

	if ('Duplicate' in err) {
		return new CanisterInternalError(`Duplicate of transaction ${err.Duplicate.duplicate_of}`);
	}

	if ('GenericError' in err) {
		return new CanisterInternalError(
			`Generic error (code ${err.GenericError.error_code}): ${err.GenericError.message}`
		);
	}

	if ('GenericBatchError' in err) {
		return new CanisterInternalError(
			`Generic batch error (code ${err.GenericBatchError.error_code}): ${err.GenericBatchError.message}`
		);
	}

	return new CanisterInternalError('Unknown Icrc7TransferError');
};
