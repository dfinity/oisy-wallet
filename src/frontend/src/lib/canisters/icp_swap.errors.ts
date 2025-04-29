import { CanisterInternalError } from '$lib/canisters/errors';

export const mapIcpSwapCanisterError = (err: any): CanisterInternalError =>
	new CanisterInternalError(JSON.stringify(err));
