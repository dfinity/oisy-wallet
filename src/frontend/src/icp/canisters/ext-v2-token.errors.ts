import type {
	CommonError,
	CommonError__1,
	TransferResponse
} from '$declarations/ext_v2_token/ext_v2_token.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapExtV2TokenCommonError = (
	err: CommonError | CommonError__1
): CanisterInternalError => {
	if ('InvalidToken' in err) {
		return new CanisterInternalError(`The specified token is invalid: ${err.InvalidToken}`);
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return new CanisterInternalError('Unknown ExtV2TokenCanisterError');
};

export const mapExtV2TokenTransferError = (response: TransferResponse): CanisterInternalError => {
	if (!('err' in response)) {
		return new CanisterInternalError('No error in TransferResponse');
	}

	const { err } = response;

	if ('CannotNotify' in err) {
		return new CanisterInternalError(`Cannot notify account: ${err.CannotNotify}`);
	}

	if ('InsufficientBalance' in err) {
		return new CanisterInternalError('Insufficient balance for the transfer');
	}

	if ('Rejected' in err) {
		return new CanisterInternalError('The transfer was rejected');
	}

	if ('Unauthorized' in err) {
		return new CanisterInternalError(`Unauthorized account: ${err.Unauthorized}`);
	}

	return mapExtV2TokenCommonError(err);
};
