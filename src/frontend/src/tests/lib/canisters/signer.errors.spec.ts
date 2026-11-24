import type { PaymentError } from '$declarations/signer/signer.did';
import {
	insufficientAllowanceOf,
	isUsageCreditsShort,
	OwnCyclesShortError,
	SignerCanisterPaymentError,
	toOwnCyclesError
} from '$lib/canisters/signer.errors';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

describe('signer.errors', () => {
	const ledger = Principal.fromText('um5iw-rqaaa-aaaaq-qaaba-cai');

	const withdrawFromError = (error: object) =>
		new SignerCanisterPaymentError({
			LedgerWithdrawFromError: { ledger, error }
		} as ConstructorParameters<typeof SignerCanisterPaymentError>[0]);

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

	describe('toOwnCyclesError', () => {
		it('turns an approval that can’t cover the call into an own-cycles shortfall', () => {
			const err = toOwnCyclesError(withdrawFromError({ InsufficientAllowance: { allowance: 1n } }));

			expect(err).toBeInstanceOf(OwnCyclesShortError);
		});

		it('turns a balance that can’t cover the call into an own-cycles shortfall', () => {
			const err = toOwnCyclesError(withdrawFromError({ InsufficientFunds: { balance: 1n } }));

			expect(err).toBeInstanceOf(OwnCyclesShortError);
		});

		it('turns the canister’s payment variant into an own-cycles shortfall too', () => {
			const err = toOwnCyclesError({
				PaymentError: {
					LedgerWithdrawFromError: { ledger, error: { InsufficientFunds: { balance: 1n } } }
				}
			});

			expect(err).toBeInstanceOf(OwnCyclesShortError);
		});

		it('keeps any other payment error as it was', () => {
			const original = withdrawFromError({ TemporarilyUnavailable: null });

			expect(toOwnCyclesError(original)).toBe(original);
		});

		it('keeps any other error as it was', () => {
			const original = new Error('test');

			expect(toOwnCyclesError(original)).toBe(original);
		});
	});

	describe('isUsageCreditsShort', () => {
		it('is true for an OISY allowance that can’t cover the call', () => {
			expect(
				isUsageCreditsShort(withdrawFromError({ InsufficientAllowance: { allowance: 1n } }))
			).toBeTruthy();
		});

		it('is true for own cycles that can’t cover the call', () => {
			expect(
				isUsageCreditsShort(
					toOwnCyclesError(withdrawFromError({ InsufficientFunds: { balance: 1n } }))
				)
			).toBeTruthy();
		});

		it('is false when OISY’s own account runs short', () => {
			expect(
				isUsageCreditsShort(withdrawFromError({ InsufficientFunds: { balance: 1n } }))
			).toBeFalsy();
		});

		it('is false for any other error', () => {
			expect(isUsageCreditsShort(new Error('test'))).toBeFalsy();
		});
	});
});
