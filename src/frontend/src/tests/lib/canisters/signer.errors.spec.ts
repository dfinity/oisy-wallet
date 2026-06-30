import type { PaymentError } from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import {
	isSignerCanisterPaymentError,
	SignerCanisterPaymentError
} from '$lib/canisters/signer.errors';
import { ZERO } from '$lib/constants/app.constants';
import { Principal } from '@dfinity/principal';

describe('signer.errors', () => {
	describe('isSignerCanisterPaymentError', () => {
		const paymentErrors: PaymentError[] = [
			{ UnsupportedPaymentType: null },
			{ InsufficientFunds: { needed: 1n, available: ZERO } },
			{ InvalidPatron: null },
			{ LedgerUnreachable: { ledger: Principal.anonymous() } } as unknown as PaymentError,
			{
				LedgerWithdrawFromError: { error: {}, ledger: Principal.anonymous() }
			} as unknown as PaymentError,
			{
				LedgerTransferFromError: { error: {}, ledger: Principal.anonymous() }
			} as unknown as PaymentError
		];

		it.each(paymentErrors)('returns true for the %o payment error variant', (paymentError) => {
			expect(
				isSignerCanisterPaymentError(new SignerCanisterPaymentError(paymentError))
			).toBeTruthy();
		});

		it('returns false for a generic CanisterInternalError', () => {
			expect(isSignerCanisterPaymentError(new CanisterInternalError('Signing error'))).toBeFalsy();
		});

		it('returns false for a plain Error', () => {
			expect(isSignerCanisterPaymentError(new Error('boom'))).toBeFalsy();
		});

		it('returns false for nullish and non-error values', () => {
			expect(isSignerCanisterPaymentError(undefined)).toBeFalsy();
			expect(isSignerCanisterPaymentError(null)).toBeFalsy();
			expect(isSignerCanisterPaymentError('Ledger error: ...')).toBeFalsy();
		});
	});
});
