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

		expect(get(insufficientFunds)).toBe(false);
		expect(get(insufficientFundsForFee)).toBe(false);
		expect(get(amountLessThanLedgerFee)).toBe(false);
		expect(get(minimumAmountNotReached)).toBe(false);
		expect(get(unknownMinimumAmount)).toBe(false);
		expect(get(minterInfoNotCertified)).toBe(false);
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

		expect(get(insufficientFunds)).toBe(true);

		expect(get(insufficientFundsForFee)).toBe(false);
		expect(get(amountLessThanLedgerFee)).toBe(false);
		expect(get(minimumAmountNotReached)).toBe(false);
		expect(get(unknownMinimumAmount)).toBe(false);
		expect(get(minterInfoNotCertified)).toBe(false);
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

		expect(get(insufficientFundsForFee)).toBe(true);

		expect(get(insufficientFunds)).toBe(false);
		expect(get(amountLessThanLedgerFee)).toBe(false);
		expect(get(minimumAmountNotReached)).toBe(false);
		expect(get(unknownMinimumAmount)).toBe(false);
		expect(get(minterInfoNotCertified)).toBe(false);
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

		expect(get(amountLessThanLedgerFee)).toBe(true);

		expect(get(insufficientFundsForFee)).toBe(false);
		expect(get(insufficientFunds)).toBe(false);
		expect(get(minimumAmountNotReached)).toBe(false);
		expect(get(unknownMinimumAmount)).toBe(false);
		expect(get(minterInfoNotCertified)).toBe(false);
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

		expect(get(minimumAmountNotReached)).toBe(true);

		expect(get(amountLessThanLedgerFee)).toBe(false);
		expect(get(insufficientFundsForFee)).toBe(false);
		expect(get(insufficientFunds)).toBe(false);
		expect(get(unknownMinimumAmount)).toBe(false);
		expect(get(minterInfoNotCertified)).toBe(false);
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

		expect(get(unknownMinimumAmount)).toBe(true);

		expect(get(minimumAmountNotReached)).toBe(false);
		expect(get(amountLessThanLedgerFee)).toBe(false);
		expect(get(insufficientFundsForFee)).toBe(false);
		expect(get(insufficientFunds)).toBe(false);
		expect(get(minterInfoNotCertified)).toBe(false);
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

		expect(get(minterInfoNotCertified)).toBe(true);

		expect(get(unknownMinimumAmount)).toBe(false);
		expect(get(minimumAmountNotReached)).toBe(false);
		expect(get(amountLessThanLedgerFee)).toBe(false);
		expect(get(insufficientFundsForFee)).toBe(false);
		expect(get(insufficientFunds)).toBe(false);
	});
});
