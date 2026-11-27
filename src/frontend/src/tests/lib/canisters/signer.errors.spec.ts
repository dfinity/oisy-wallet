import type { PaymentError } from '$declarations/signer/signer.did';
import { insufficientAllowanceOf, SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import { mockPrincipal } from '$tests/mocks/identity.mock';

describe('signer.errors', () => {
	describe('insufficientAllowanceOf', () => {
		const paymentError: PaymentError = {
			LedgerWithdrawFromError: {
				ledger: mockPrincipal,
				error: { InsufficientAllowance: { allowance: 7_800_000_000n } }
			}
		};

		it('should return the allowance a failed call states', () => {
			expect(insufficientAllowanceOf(new SignerCanisterPaymentError(paymentError))).toBe(
				7_800_000_000n
			);
		});

		it('should return the allowance from the error variant a call throws as it is', () => {
			expect(insufficientAllowanceOf({ PaymentError: paymentError })).toBe(7_800_000_000n);
		});

		it('should follow the chain of causes of an error that wraps it', () => {
			const err = new Error('outer', {
				cause: new Error('middle', { cause: new SignerCanisterPaymentError(paymentError) })
			});

			expect(insufficientAllowanceOf(err)).toBe(7_800_000_000n);
		});

		it('should stop at a chain of causes that loops', () => {
			const first = new Error('first');
			first.cause = new Error('second', { cause: first });

			expect(insufficientAllowanceOf(first)).toBeUndefined();
		});

		it('should return undefined for any other error', () => {
			expect(insufficientAllowanceOf(new Error('other'))).toBeUndefined();
			expect(insufficientAllowanceOf(undefined)).toBeUndefined();
		});
	});
});
