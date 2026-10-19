import type { WithdrawSolError } from '$declarations/cksol_minter/cksol_minter.did';
import { CanisterInternalError } from '$lib/canisters/errors';

// The minter answers every refusal before it burns, so this error means no ckSOL
// left the account. `error` keeps the minter's answer for the caller to explain.
export class CkSolWithdrawSolError extends CanisterInternalError {
	constructor(readonly error: WithdrawSolError) {
		super(`The ckSOL minter refused the withdrawal: ${Object.keys(error).join()}`);
	}
}
