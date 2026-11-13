import type {
	WatchDepositAddressError,
	WithdrawSolError
} from '$declarations/cksol_minter/cksol_minter.did';
import { CanisterInternalError } from '$lib/canisters/errors';

// `error` keeps the minter's answer, for the caller to explain or to read the deposit id from.
export class CkSolWatchDepositAddressError extends CanisterInternalError {
	constructor(readonly error: WatchDepositAddressError) {
		super(`The ckSOL minter refused to watch the deposit address: ${Object.keys(error).join()}`);
	}
}

// The minter answers every refusal before it burns, so this error means no ckSOL
// left the account. `error` keeps the minter's answer for the caller to explain.
export class CkSolWithdrawSolError extends CanisterInternalError {
	constructor(readonly error: WithdrawSolError) {
		super(`The ckSOL minter refused the withdrawal: ${Object.keys(error).join()}`);
	}
}
