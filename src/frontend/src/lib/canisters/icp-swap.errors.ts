import type { Error as FactoryError } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapIcpSwapFactoryError = (err: FactoryError): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(`Internal error: ${err.InternalError}`);
	}

	if ('UnsupportedToken' in err) {
		return new CanisterInternalError(`Unsupported token: ${err.UnsupportedToken}`);
	}

	if ('InsufficientFunds' in err) {
		return new CanisterInternalError(`Insufficient funds`);
	}

	if ('CommonError' in err) {
		return new CanisterInternalError(`Common error: ${err.CommonError}`);
	}

	return new CanisterInternalError('Unknown IcpSwapFactoryError');
};
