import type { NotifyError } from '$declarations/cmc/cmc.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { fromNullable } from '@dfinity/utils';

// `retryable` answers the one question a caller has when a notify fails: can
// notifying the same block again still mint? The CMC keeps a block's status
// only for its final answers, so everything but those is worth retrying.
export class CmcNotifyError extends CanisterInternalError {
	readonly retryable: boolean;

	constructor({ message, retryable }: { message: string; retryable: boolean }) {
		super(message);
		this.retryable = retryable;
	}
}

// Another call is notifying the same block right now; asking again returns its
// result once it is stored.
export class CmcNotifyProcessingError extends CmcNotifyError {
	constructor() {
		super({ message: 'The CMC is already processing this block', retryable: true });
	}
}

// Final: the CMC could not mint and returned the ICP, minus its fees.
export class CmcNotifyRefundedError extends CmcNotifyError {
	constructor(
		readonly refundBlockIndex: bigint | undefined,
		reason: string
	) {
		super({ message: reason, retryable: false });
	}
}

// Final: the block is older than the notifications the CMC still keeps, so it
// can no longer be processed.
export class CmcNotifyTransactionTooOldError extends CmcNotifyError {
	constructor(readonly oldestProcessableBlockIndex: bigint) {
		super({ message: 'The block is too old for the CMC to process', retryable: false });
	}
}

// Final: the block is not a transfer to the caller's deposit account with the
// expected memo.
export class CmcNotifyInvalidTransactionError extends CmcNotifyError {
	constructor(reason: string) {
		super({ message: reason, retryable: false });
	}
}

// The CMC's own error codes that a retry cannot change: a bad subnet selection,
// an unauthorised caller and a deposit memo that is too long depend only on the
// call, which a retry repeats. The CMC clears a block's status after every error
// except `Refunded`, so any other code is retried: an internal error (e.g. no
// conversion rate yet), a ledger it could not reach, a refund it could not send,
// and a code added later, which must not close a mint whose ICP it still holds.
const FINAL_OTHER_ERROR_CODES: bigint[] = [4n, 5n, 6n];

export class CmcNotifyOtherError extends CmcNotifyError {
	constructor(
		readonly errorCode: bigint,
		errorMessage: string
	) {
		super({
			message: errorMessage,
			retryable: !FINAL_OTHER_ERROR_CODES.includes(errorCode)
		});
	}
}

export const mapCmcNotifyError = (err: NotifyError): CmcNotifyError => {
	if ('Processing' in err) {
		return new CmcNotifyProcessingError();
	}

	if ('Refunded' in err) {
		const { block_index, reason } = err.Refunded;
		return new CmcNotifyRefundedError(fromNullable(block_index), reason);
	}

	if ('TransactionTooOld' in err) {
		return new CmcNotifyTransactionTooOldError(err.TransactionTooOld);
	}

	if ('InvalidTransaction' in err) {
		return new CmcNotifyInvalidTransactionError(err.InvalidTransaction);
	}

	const { error_code, error_message } = err.Other;
	return new CmcNotifyOtherError(error_code, error_message);
};
