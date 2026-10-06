import type { WithdrawError } from '$declarations/cycles_ledger/cycles_ledger.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { fromNullable } from '@dfinity/utils';

// Why the cycles ledger refused a withdrawal. It checks all of these before it burns
// anything, so nothing left the account.
export type CyclesLedgerWithdrawRefusal =
	| 'insufficient_funds'
	| 'invalid_receiver'
	| 'too_old'
	| 'created_in_future'
	| 'temporarily_unavailable'
	| 'bad_fee'
	| 'generic';

export class CyclesLedgerWithdrawError extends CanisterInternalError {}

// The same withdrawal, creation timestamp included, already went through: the ledger
// answers with its block instead of running it again.
export class CyclesLedgerWithdrawDuplicateError extends CyclesLedgerWithdrawError {
	constructor(readonly duplicateOf: bigint) {
		super('The cycles ledger already executed this withdrawal');
	}
}

// The ledger burnt the cycles, but the canister could not receive them, so it minted the
// amount back minus its fee. Without a refund block the amount did not cover that fee, and
// nothing came back.
export class CyclesLedgerWithdrawFailedError extends CyclesLedgerWithdrawError {
	constructor(
		readonly refundBlockIndex: bigint | undefined,
		reason: string
	) {
		super(reason);
	}
}

export class CyclesLedgerWithdrawRefusedError extends CyclesLedgerWithdrawError {
	constructor(
		readonly refusal: CyclesLedgerWithdrawRefusal,
		message: string
	) {
		super(message);
	}
}

export const mapCyclesLedgerWithdrawError = (err: WithdrawError): CyclesLedgerWithdrawError => {
	if ('Duplicate' in err) {
		return new CyclesLedgerWithdrawDuplicateError(err.Duplicate.duplicate_of);
	}

	if ('FailedToWithdraw' in err) {
		const { fee_block, rejection_reason } = err.FailedToWithdraw;
		return new CyclesLedgerWithdrawFailedError(fromNullable(fee_block), rejection_reason);
	}

	if ('InsufficientFunds' in err) {
		return new CyclesLedgerWithdrawRefusedError(
			'insufficient_funds',
			`Insufficient funds, balance ${err.InsufficientFunds.balance}`
		);
	}

	if ('InvalidReceiver' in err) {
		return new CyclesLedgerWithdrawRefusedError(
			'invalid_receiver',
			`${err.InvalidReceiver.receiver.toText()} is not a canister`
		);
	}

	if ('TooOld' in err) {
		return new CyclesLedgerWithdrawRefusedError('too_old', 'The creation time is too old');
	}

	if ('CreatedInFuture' in err) {
		return new CyclesLedgerWithdrawRefusedError(
			'created_in_future',
			`The creation time is ahead of the ledger time ${err.CreatedInFuture.ledger_time}`
		);
	}

	if ('TemporarilyUnavailable' in err) {
		return new CyclesLedgerWithdrawRefusedError(
			'temporarily_unavailable',
			'The cycles ledger is temporarily unavailable'
		);
	}

	if ('BadFee' in err) {
		return new CyclesLedgerWithdrawRefusedError(
			'bad_fee',
			`Bad fee, expected ${err.BadFee.expected_fee}`
		);
	}

	return new CyclesLedgerWithdrawRefusedError('generic', err.GenericError.message);
};
