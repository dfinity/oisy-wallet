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

// The CMC's own error codes. An internal error (e.g. no conversion rate yet), a
// ledger it could not reach and a refund it could not send all clear the
// block's status, so a later notify runs the mint again.
const RETRYABLE_OTHER_ERROR_CODES: bigint[] = [1n, 2n, 3n];

export class CmcNotifyOtherError extends CmcNotifyError {
	constructor(
		readonly errorCode: bigint,
		errorMessage: string
	) {
		super({
			message: errorMessage,
			retryable: RETRYABLE_OTHER_ERROR_CODES.includes(errorCode)
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
