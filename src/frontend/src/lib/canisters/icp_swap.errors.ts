import { type Error as SwapPoolError } from '$declarations/icp_swap/icp_swap.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapIcpSwapCanisterError = (err: SwapPoolError): CanisterInternalError =>
	new CanisterInternalError(JSON.stringify(err));
