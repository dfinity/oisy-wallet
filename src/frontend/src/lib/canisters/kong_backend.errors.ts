import { CanisterInternalError } from '$lib/canisters/errors';
import { jsonReplacer } from '@dfinity/utils';

export class KongBackendCanisterError extends CanisterInternalError {
	constructor(err: string) {
		super(`Kong Backend error: ${JSON.stringify(err, jsonReplacer)}`);
	}
}

export const mapKongBackendCanisterError = (err: string): CanisterInternalError =>
	new CanisterInternalError(err);
