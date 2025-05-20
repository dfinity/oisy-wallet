import type {
	ApproveError,
	CreateCanisterError,
	CreateCanisterFromError,
	TransferError,
	TransferFromError,
	WithdrawError,
	WithdrawFromError
} from '$declarations/cycles_ledger/cycles_ledger.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapTransferError = (err: TransferError): CanisterInternalError => {
	if ('GenericError' in err) {
		return new CanisterInternalError(
			`${err.GenericError.message} (Error code: ${err.GenericError.error_code})`
		);
	}
	if ('TemporarilyUnavailable' in err) {
		return new CanisterInternalError('The service is temporarily unavailable');
	}
	if ('BadBurn' in err) {
		return new CanisterInternalError(
			`Invalid burn amount, minimum burn amount is ${err.BadBurn.min_burn_amount}`
		);
	}
	if ('Duplicate' in err) {
		return new CanisterInternalError(
			`Duplicate transaction, already processed in block ${err.Duplicate.duplicate_of}`
		);
	}
	if ('BadFee' in err) {
		return new CanisterInternalError(`Incorrect fee, expected fee is ${err.BadFee.expected_fee}`);
	}
	if ('CreatedInFuture' in err) {
		return new CanisterInternalError(
			`Transaction created in future. Ledger time: ${err.CreatedInFuture.ledger_time}`
		);
	}
	if ('TooOld' in err) {
		return new CanisterInternalError('Transaction too old');
	}
	if ('InsufficientFunds' in err) {
		return new CanisterInternalError(
			`Insufficient funds. Current balance: ${err.InsufficientFunds.balance}`
		);
	}

	return new CanisterInternalError('Unknown transfer error');
};

export const mapApproveError = (err: ApproveError): CanisterInternalError => {
	if ('GenericError' in err) {
		return new CanisterInternalError(
			`${err.GenericError.message} (Error code: ${err.GenericError.error_code})`
		);
	}
	if ('TemporarilyUnavailable' in err) {
		return new CanisterInternalError('The service is temporarily unavailable');
	}
	if ('Duplicate' in err) {
		return new CanisterInternalError(
			`Duplicate transaction, already processed in block ${err.Duplicate.duplicate_of}`
		);
	}
	if ('BadFee' in err) {
		return new CanisterInternalError(`Incorrect fee, expected fee is ${err.BadFee.expected_fee}`);
	}
	if ('AllowanceChanged' in err) {
		return new CanisterInternalError(
			`Allowance changed, current allowance: ${err.AllowanceChanged.current_allowance}`
		);
	}
	if ('CreatedInFuture' in err) {
		return new CanisterInternalError(
			`Transaction created in future. Ledger time: ${err.CreatedInFuture.ledger_time}`
		);
	}
	if ('TooOld' in err) {
		return new CanisterInternalError('Transaction too old');
	}
	if ('Expired' in err) {
		return new CanisterInternalError(`Approval expired at ledger time: ${err.Expired.ledger_time}`);
	}
	if ('InsufficientFunds' in err) {
		return new CanisterInternalError(
			`Insufficient funds. Current balance: ${err.InsufficientFunds.balance}`
		);
	}

	return new CanisterInternalError('Unknown approve error');
};

export const mapTransferFromError = (err: TransferFromError): CanisterInternalError => {
	if ('GenericError' in err) {
		return new CanisterInternalError(
			`${err.GenericError.message} (Error code: ${err.GenericError.error_code})`
		);
	}
	if ('TemporarilyUnavailable' in err) {
		return new CanisterInternalError('The service is temporarily unavailable');
	}
	if ('InsufficientAllowance' in err) {
		return new CanisterInternalError(
			`Insufficient allowance. Current allowance: ${err.InsufficientAllowance.allowance}`
		);
	}
	if ('BadBurn' in err) {
		return new CanisterInternalError(
			`Invalid burn amount, minimum burn amount is ${err.BadBurn.min_burn_amount}`
		);
	}
	if ('Duplicate' in err) {
		return new CanisterInternalError(
			`Duplicate transaction, already processed in block ${err.Duplicate.duplicate_of}`
		);
	}
	if ('BadFee' in err) {
		return new CanisterInternalError(`Incorrect fee, expected fee is ${err.BadFee.expected_fee}`);
	}
	if ('CreatedInFuture' in err) {
		return new CanisterInternalError(
			`Transaction created in future. Ledger time: ${err.CreatedInFuture.ledger_time}`
		);
	}
	if ('TooOld' in err) {
		return new CanisterInternalError('Transaction too old');
	}
	if ('InsufficientFunds' in err) {
		return new CanisterInternalError(
			`Insufficient funds. Current balance: ${err.InsufficientFunds.balance}`
		);
	}

	return new CanisterInternalError('Unknown transfer from error');
};

export const mapCreateCanisterError = (err: CreateCanisterError): CanisterInternalError => {
	if ('GenericError' in err) {
		return new CanisterInternalError(
			`${err.GenericError.message} (Error code: ${err.GenericError.error_code})`
		);
	}
	if ('TemporarilyUnavailable' in err) {
		return new CanisterInternalError('The service is temporarily unavailable');
	}
	if ('Duplicate' in err) {
		const canisterId = err.Duplicate.canister_id?.[0]
			? err.Duplicate.canister_id[0].toString()
			: 'unknown';
		return new CanisterInternalError(
			`Duplicate transaction, already processed in block ${err.Duplicate.duplicate_of} for canister ${canisterId}`
		);
	}
	if ('CreatedInFuture' in err) {
		return new CanisterInternalError(
			`Transaction created in future. Ledger time: ${err.CreatedInFuture.ledger_time}`
		);
	}
	if ('FailedToCreate' in err) {
		const refundBlock = err.FailedToCreate.refund_block?.[0]
			? `Refund in block ${err.FailedToCreate.refund_block[0]}`
			: 'No refund';
		const feeBlock = err.FailedToCreate.fee_block?.[0]
			? `Fee in block ${err.FailedToCreate.fee_block[0]}`
			: 'No fee block';
		return new CanisterInternalError(
			`Failed to create canister: ${err.FailedToCreate.error}. ${refundBlock}. ${feeBlock}`
		);
	}
	if ('TooOld' in err) {
		return new CanisterInternalError('Transaction too old');
	}
	if ('InsufficientFunds' in err) {
		return new CanisterInternalError(
			`Insufficient funds. Current balance: ${err.InsufficientFunds.balance}`
		);
	}

	return new CanisterInternalError('Unknown create canister error');
};

export const mapCreateCanisterFromError = (err: CreateCanisterFromError): CanisterInternalError => {
	if ('FailedToCreateFrom' in err) {
		const refundBlock = err.FailedToCreateFrom.refund_block?.[0]
			? `Refund in block ${err.FailedToCreateFrom.refund_block[0]}`
			: 'No refund';
		const approvalRefundBlock = err.FailedToCreateFrom.approval_refund_block?.[0]
			? `Approval refund in block ${err.FailedToCreateFrom.approval_refund_block[0]}`
			: 'No approval refund';
		return new CanisterInternalError(
			`Failed to create canister: ${err.FailedToCreateFrom.rejection_reason}. ${refundBlock}. ${approvalRefundBlock}`
		);
	}
	if ('GenericError' in err) {
		return new CanisterInternalError(
			`${err.GenericError.message} (Error code: ${err.GenericError.error_code})`
		);
	}
	if ('TemporarilyUnavailable' in err) {
		return new CanisterInternalError('The service is temporarily unavailable');
	}
	if ('InsufficientAllowance' in err) {
		return new CanisterInternalError(
			`Insufficient allowance. Current allowance: ${err.InsufficientAllowance.allowance}`
		);
	}
	if ('Duplicate' in err) {
		const canisterId = err.Duplicate.canister_id?.[0]
			? err.Duplicate.canister_id[0].toString()
			: 'unknown';
		return new CanisterInternalError(
			`Duplicate transaction, already processed in block ${err.Duplicate.duplicate_of} for canister ${canisterId}`
		);
	}
	if ('CreatedInFuture' in err) {
		return new CanisterInternalError(
			`Transaction created in future. Ledger time: ${err.CreatedInFuture.ledger_time}`
		);
	}
	if ('TooOld' in err) {
		return new CanisterInternalError('Transaction too old');
	}
	if ('InsufficientFunds' in err) {
		return new CanisterInternalError(
			`Insufficient funds. Current balance: ${err.InsufficientFunds.balance}`
		);
	}

	return new CanisterInternalError('Unknown create canister from error');
};

export const mapWithdrawError = (err: WithdrawError): CanisterInternalError => {
	if ('FailedToWithdraw' in err) {
		const feeBlock = err.FailedToWithdraw.fee_block?.[0]
			? `Fee in block ${err.FailedToWithdraw.fee_block[0]}`
			: 'No fee block';
		return new CanisterInternalError(
			`Failed to withdraw: ${err.FailedToWithdraw.rejection_reason}. ${feeBlock}`
		);
	}
	if ('GenericError' in err) {
		return new CanisterInternalError(
			`${err.GenericError.message} (Error code: ${err.GenericError.error_code})`
		);
	}
	if ('TemporarilyUnavailable' in err) {
		return new CanisterInternalError('The service is temporarily unavailable');
	}
	if ('Duplicate' in err) {
		return new CanisterInternalError(
			`Duplicate transaction, already processed in block ${err.Duplicate.duplicate_of}`
		);
	}
	if ('BadFee' in err) {
		return new CanisterInternalError(`Incorrect fee, expected fee is ${err.BadFee.expected_fee}`);
	}
	if ('InvalidReceiver' in err) {
		return new CanisterInternalError(
			`Invalid receiver: ${err.InvalidReceiver.receiver.toString()}`
		);
	}
	if ('CreatedInFuture' in err) {
		return new CanisterInternalError(
			`Transaction created in future. Ledger time: ${err.CreatedInFuture.ledger_time}`
		);
	}
	if ('TooOld' in err) {
		return new CanisterInternalError('Transaction too old');
	}
	if ('InsufficientFunds' in err) {
		return new CanisterInternalError(
			`Insufficient funds. Current balance: ${err.InsufficientFunds.balance}`
		);
	}

	return new CanisterInternalError('Unknown withdraw error');
};

export const mapWithdrawFromError = (err: WithdrawFromError): CanisterInternalError => {
	if ('GenericError' in err) {
		return new CanisterInternalError(
			`${err.GenericError.message} (Error code: ${err.GenericError.error_code})`
		);
	}
	if ('TemporarilyUnavailable' in err) {
		return new CanisterInternalError('The service is temporarily unavailable');
	}
	if ('InsufficientAllowance' in err) {
		return new CanisterInternalError(
			`Insufficient allowance. Current allowance: ${err.InsufficientAllowance.allowance}`
		);
	}
	if ('Duplicate' in err) {
		return new CanisterInternalError(
			`Duplicate transaction, already processed in block ${err.Duplicate.duplicate_of}`
		);
	}
	if ('InvalidReceiver' in err) {
		return new CanisterInternalError(
			`Invalid receiver: ${err.InvalidReceiver.receiver.toString()}`
		);
	}
	if ('CreatedInFuture' in err) {
		return new CanisterInternalError(
			`Transaction created in future. Ledger time: ${err.CreatedInFuture.ledger_time}`
		);
	}
	if ('TooOld' in err) {
		return new CanisterInternalError('Transaction too old');
	}
	if ('FailedToWithdrawFrom' in err) {
		const withdrawFromBlock = err.FailedToWithdrawFrom.withdraw_from_block?.[0]
			? `Withdraw from block ${err.FailedToWithdrawFrom.withdraw_from_block[0]}`
			: 'No withdraw from block';
		const refundBlock = err.FailedToWithdrawFrom.refund_block?.[0]
			? `Refund in block ${err.FailedToWithdrawFrom.refund_block[0]}`
			: 'No refund';
		const approvalRefundBlock = err.FailedToWithdrawFrom.approval_refund_block?.[0]
			? `Approval refund in block ${err.FailedToWithdrawFrom.approval_refund_block[0]}`
			: 'No approval refund';

		return new CanisterInternalError(
			`Failed to withdraw from: ${err.FailedToWithdrawFrom.rejection_reason}. ${withdrawFromBlock}. ${refundBlock}. ${approvalRefundBlock}`
		);
	}
	if ('InsufficientFunds' in err) {
		return new CanisterInternalError(
			`Insufficient funds. Current balance: ${err.InsufficientFunds.balance}`
		);
	}

	return new CanisterInternalError('Unknown withdraw from error');
};
