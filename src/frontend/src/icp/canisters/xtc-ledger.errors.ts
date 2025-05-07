import type { TxError } from '$declarations/xtc_ledger/xtc_ledger.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapXtcLedgerCanisterError = (err: TxError): CanisterInternalError => {
	if ('NotifyDfxFailed' in err) {
		return new CanisterInternalError('Notify DFX failed');
	}

	if ('InsufficientAllowance' in err) {
		return new CanisterInternalError('Insufficient allowance');
	}

	if ('UnexpectedCyclesResponse' in err) {
		return new CanisterInternalError('Unexpected cycles response');
	}

	if ('InsufficientBalance' in err) {
		return new CanisterInternalError('Insufficient balance');
	}

	if ('InsufficientXTCFee' in err) {
		return new CanisterInternalError('Insufficient XTC fee');
	}

	if ('ErrorOperationStyle' in err) {
		return new CanisterInternalError('Error operation style');
	}

	if ('Unauthorized' in err) {
		return new CanisterInternalError('Unauthorized');
	}

	if ('LedgerTrap' in err) {
		return new CanisterInternalError('Ledger trap');
	}

	if ('ErrorTo' in err) {
		return new CanisterInternalError('Error To');
	}

	if ('Other' in err) {
		return new CanisterInternalError('Other');
	}

	if ('FetchRateFailed' in err) {
		return new CanisterInternalError('Fetch rate failed');
	}

	if ('BlockUsed' in err) {
		return new CanisterInternalError('Block used');
	}

	if ('AmountTooSmall' in err) {
		return new CanisterInternalError('Amount too small');
	}

	return new CanisterInternalError('Unknown XtcLedgerCanisterError');
};
