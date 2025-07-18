import { initTokenActionValidationErrorsContext } from '$lib/stores/token-action-validation-errors.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get } from 'svelte/store';

describe('tokenActionValidationErrorsStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initTokenActionValidationErrorsContext({
				errorType: 'insufficient-funds'
			})
		);
	});

	it('should have all expected values on empty state', () => {
		const {
			insufficientFunds,
			insufficientFundsForFee,
			amountLessThanLedgerFee,
			minimumAmountNotReached,
			unknownMinimumAmount,
			minterInfoNotCertified
		} = initTokenActionValidationErrorsContext();

		expect(get(insufficientFunds)).toBeFalsy();
		expect(get(insufficientFundsForFee)).toBeFalsy();
		expect(get(amountLessThanLedgerFee)).toBeFalsy();
		expect(get(minimumAmountNotReached)).toBeFalsy();
		expect(get(unknownMinimumAmount)).toBeFalsy();
		expect(get(minterInfoNotCertified)).toBeFalsy();
	});

	it('should have all expected values on insufficient-funds error', () => {
		const {
			insufficientFunds,
			insufficientFundsForFee,
			amountLessThanLedgerFee,
			minimumAmountNotReached,
			unknownMinimumAmount,
			minterInfoNotCertified,
			setErrorType
		} = initTokenActionValidationErrorsContext();

		setErrorType('insufficient-funds');

		expect(get(insufficientFunds)).toBeTruthy();

		expect(get(insufficientFundsForFee)).toBeFalsy();
		expect(get(amountLessThanLedgerFee)).toBeFalsy();
		expect(get(minimumAmountNotReached)).toBeFalsy();
		expect(get(unknownMinimumAmount)).toBeFalsy();
		expect(get(minterInfoNotCertified)).toBeFalsy();
	});

	it('should have all expected values on insufficient-funds-for-fee error', () => {
		const {
			insufficientFunds,
			insufficientFundsForFee,
			amountLessThanLedgerFee,
			minimumAmountNotReached,
			unknownMinimumAmount,
			minterInfoNotCertified,
			setErrorType
		} = initTokenActionValidationErrorsContext();

		setErrorType('insufficient-funds-for-fee');

		expect(get(insufficientFundsForFee)).toBeTruthy();

		expect(get(insufficientFunds)).toBeFalsy();
		expect(get(amountLessThanLedgerFee)).toBeFalsy();
		expect(get(minimumAmountNotReached)).toBeFalsy();
		expect(get(unknownMinimumAmount)).toBeFalsy();
		expect(get(minterInfoNotCertified)).toBeFalsy();
	});

	it('should have all expected values on amount-less-than-ledger-fee error', () => {
		const {
			insufficientFunds,
			insufficientFundsForFee,
			amountLessThanLedgerFee,
			minimumAmountNotReached,
			unknownMinimumAmount,
			minterInfoNotCertified,
			setErrorType
		} = initTokenActionValidationErrorsContext();

		setErrorType('amount-less-than-ledger-fee');

		expect(get(amountLessThanLedgerFee)).toBeTruthy();

		expect(get(insufficientFundsForFee)).toBeFalsy();
		expect(get(insufficientFunds)).toBeFalsy();
		expect(get(minimumAmountNotReached)).toBeFalsy();
		expect(get(unknownMinimumAmount)).toBeFalsy();
		expect(get(minterInfoNotCertified)).toBeFalsy();
	});

	it('should have all expected values on minimum-amount-not-reached error', () => {
		const {
			insufficientFunds,
			insufficientFundsForFee,
			amountLessThanLedgerFee,
			minimumAmountNotReached,
			unknownMinimumAmount,
			minterInfoNotCertified,
			setErrorType
		} = initTokenActionValidationErrorsContext();

		setErrorType('minimum-amount-not-reached');

		expect(get(minimumAmountNotReached)).toBeTruthy();

		expect(get(amountLessThanLedgerFee)).toBeFalsy();
		expect(get(insufficientFundsForFee)).toBeFalsy();
		expect(get(insufficientFunds)).toBeFalsy();
		expect(get(unknownMinimumAmount)).toBeFalsy();
		expect(get(minterInfoNotCertified)).toBeFalsy();
	});

	it('should have all expected values on unknown-minimum-amount error', () => {
		const {
			insufficientFunds,
			insufficientFundsForFee,
			amountLessThanLedgerFee,
			minimumAmountNotReached,
			unknownMinimumAmount,
			minterInfoNotCertified,
			setErrorType
		} = initTokenActionValidationErrorsContext();

		setErrorType('unknown-minimum-amount');

		expect(get(unknownMinimumAmount)).toBeTruthy();

		expect(get(minimumAmountNotReached)).toBeFalsy();
		expect(get(amountLessThanLedgerFee)).toBeFalsy();
		expect(get(insufficientFundsForFee)).toBeFalsy();
		expect(get(insufficientFunds)).toBeFalsy();
		expect(get(minterInfoNotCertified)).toBeFalsy();
	});

	it('should have all expected values on minter-info-not-certified error', () => {
		const {
			insufficientFunds,
			insufficientFundsForFee,
			amountLessThanLedgerFee,
			minimumAmountNotReached,
			unknownMinimumAmount,
			minterInfoNotCertified,
			setErrorType
		} = initTokenActionValidationErrorsContext();

		setErrorType('minter-info-not-certified');

		expect(get(minterInfoNotCertified)).toBeTruthy();

		expect(get(unknownMinimumAmount)).toBeFalsy();
		expect(get(minimumAmountNotReached)).toBeFalsy();
		expect(get(amountLessThanLedgerFee)).toBeFalsy();
		expect(get(insufficientFundsForFee)).toBeFalsy();
		expect(get(insufficientFunds)).toBeFalsy();
	});
});
