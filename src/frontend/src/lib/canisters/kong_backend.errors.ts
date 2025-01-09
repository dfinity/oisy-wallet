import { CanisterInternalError } from '$lib/canisters/errors';

export const mapKongBackendCanisterError = (err: string): CanisterInternalError =>
	new CanisterInternalError(err);
