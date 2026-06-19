import type { PaymentError } from '$declarations/signer/signer.did';
import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import { i18n } from '$lib/stores/i18n.store';
import { toastsSignerUnavailableOr } from '$lib/stores/toasts.store';
import { toastsStore } from '@dfinity/gix-components';
import { Principal } from '@dfinity/principal';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('toasts.store', () => {
	describe('toastsSignerUnavailableOr', () => {
		let showSpy: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();
			showSpy = vi.spyOn(toastsStore, 'show').mockReturnValue(Symbol('toast'));
			vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		it('shows the generic signer-unavailable toast without the raw error for a payment error', () => {
			const err = new SignerCanisterPaymentError({ UnsupportedPaymentType: null });
			const fallback = vi.fn();

			toastsSignerUnavailableOr({ err, fallback });

			expect(fallback).not.toHaveBeenCalled();
			expect(showSpy).toHaveBeenCalledOnce();

			const [[shown]] = showSpy.mock.calls;

			expect(shown.text).toBe(get(i18n).sign.error.unavailable);
			expect(shown.level).toBe('error');
			// The scary raw ledger detail must not leak into the toast.
			expect(shown.text).not.toContain(err.message);
			expect(shown.text).not.toContain('/');
		});

		it('shows the per-user limit toast for an exhausted-allowance payment error', () => {
			const err = new SignerCanisterPaymentError({
				LedgerWithdrawFromError: {
					error: { InsufficientAllowance: { allowance: 1n } },
					ledger: Principal.anonymous()
				}
			} as unknown as PaymentError);
			const fallback = vi.fn();

			toastsSignerUnavailableOr({ err, fallback });

			expect(fallback).not.toHaveBeenCalled();
			expect(showSpy).toHaveBeenCalledOnce();

			const [[shown]] = showSpy.mock.calls;

			expect(shown.text).toBe(get(i18n).sign.error.limit_reached);
			expect(shown.text).not.toBe(get(i18n).sign.error.unavailable);
		});

		it('calls the fallback and shows no signer-unavailable toast for a non-payment error', () => {
			const fallback = vi.fn();

			toastsSignerUnavailableOr({ err: new Error('Invalid address'), fallback });

			expect(fallback).toHaveBeenCalledOnce();
			expect(showSpy).not.toHaveBeenCalled();
		});

		it('calls the fallback for nullish errors', () => {
			const fallback = vi.fn();

			toastsSignerUnavailableOr({ err: undefined, fallback });

			expect(fallback).toHaveBeenCalledOnce();
			expect(showSpy).not.toHaveBeenCalled();
		});
	});
});
