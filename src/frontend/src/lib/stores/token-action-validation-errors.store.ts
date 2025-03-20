import type { TokenActionErrorType } from '$lib/types/token-action';
import { nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface TokenActionValidationErrorsData {
	errorType?: TokenActionErrorType;
}

export const initTokenActionValidationErrorsContext = (
	initialData: TokenActionValidationErrorsData = {}
): TokenActionValidationErrorsContext => {
	const data = writable<TokenActionValidationErrorsData>(initialData);
	const { update } = data;

	const insufficientFunds = derived(
		[data],
		([{ errorType }]) => nonNullish(errorType) && errorType === 'insufficient-funds'
	);
	const insufficientFundsForFee = derived(
		[data],
		([{ errorType }]) => nonNullish(errorType) && errorType === 'insufficient-funds-for-fee'
	);
	const amountLessThanLedgerFee = derived(
		[data],
		([{ errorType }]) => nonNullish(errorType) && errorType === 'amount-less-than-ledger-fee'
	);
	const minimumAmountNotReached = derived(
		[data],
		([{ errorType }]) => nonNullish(errorType) && errorType === 'minimum-amount-not-reached'
	);
	const unknownMinimumAmount = derived(
		[data],
		([{ errorType }]) => nonNullish(errorType) && errorType === 'unknown-minimum-amount'
	);
	const minterInfoNotCertified = derived(
		[data],
		([{ errorType }]) => nonNullish(errorType) && errorType === 'minter-info-not-certified'
	);

	return {
		insufficientFunds,
		insufficientFundsForFee,
		amountLessThanLedgerFee,
		minimumAmountNotReached,
		unknownMinimumAmount,
		minterInfoNotCertified,
		setErrorType: (type: TokenActionErrorType) =>
			update((state) => ({
				...state,
				errorType: type
			}))
	};
};

export interface TokenActionValidationErrorsContext {
	insufficientFunds: Readable<boolean>;
	insufficientFundsForFee: Readable<boolean>;
	amountLessThanLedgerFee: Readable<boolean>;
	minimumAmountNotReached: Readable<boolean>;
	unknownMinimumAmount: Readable<boolean>;
	minterInfoNotCertified: Readable<boolean>;
	setErrorType: (type: TokenActionErrorType) => void;
}

export const TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY = Symbol('token-action-validation-errors');
