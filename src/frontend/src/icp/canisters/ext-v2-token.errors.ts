import type { CommonError__1 } from '$declarations/ext_v2_token/ext_v2_token.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapExtV2TokenBalanceError = (err: CommonError__1): CanisterInternalError => {
	if ('InvalidToken' in err) {
		return new CanisterInternalError(`The specified token is invalid: ${err.InvalidToken}`);
	}

	if ('Other' in err) {
		return new CanisterInternalError(err.Other);
	}

	return new CanisterInternalError('Unknown ExtV2TokenCanisterError');
};
