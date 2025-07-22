import { SwapError, throwSwapError } from '$lib/services/swap-errors.services';
import en from '$tests/mocks/i18n.mock';

describe('SwapError Service', () => {
	describe('throwSwapError', () => {
		it('should throw SwapError for deposit_error', () => {
			expect(() =>
				throwSwapError({ code: 'deposit_error', message: en.swap.error.deposit_error })
			).toThrow(SwapError);
		});

		it('should throw SwapError for withdraw_failed', () => {
			expect(() =>
				throwSwapError({ code: 'withdraw_failed', message: en.swap.error.withdraw_failed })
			).toThrow(SwapError);
		});

		it('should throw SwapError for swap_failed_withdraw_success', () => {
			expect(() =>
				throwSwapError({
					code: 'swap_failed_withdraw_success',
					message: en.swap.error.swap_failed_withdraw_success
				})
			).toThrow(SwapError);
		});

		it('should throw correct error messages', () => {
			expect(() =>
				throwSwapError({ code: 'deposit_error', message: en.swap.error.deposit_error })
			).toThrow(en.swap.error.deposit_error);

			expect(() =>
				throwSwapError({ code: 'withdraw_failed', message: en.swap.error.withdraw_failed })
			).toThrow(en.swap.error.withdraw_failed);

			expect(() =>
				throwSwapError({
					code: 'swap_failed_withdraw_success',
					message: en.swap.error.swap_failed_withdraw_success
				})
			).toThrow(en.swap.error.swap_failed_withdraw_success);
		});
	});

	describe('SwapError class', () => {
		it('should be instantiated with deposit_error and correct message', () => {
			const error = new SwapError('deposit_error', en.swap.error.deposit_error);

			expect(error.code).toBe('deposit_error');
			expect(error.message).toBe(en.swap.error.deposit_error);
			expect(error.name).toBe('SwapError');
		});

		it('should be instantiated with withdraw_failed and correct message', () => {
			const error = new SwapError('withdraw_failed', en.swap.error.withdraw_failed);

			expect(error.code).toBe('withdraw_failed');
			expect(error.message).toBe(en.swap.error.withdraw_failed);
			expect(error.name).toBe('SwapError');
		});

		it('should be instantiated with swap_failed_withdraw_success and correct message', () => {
			const error = new SwapError(
				'swap_failed_withdraw_success',
				en.swap.error.swap_failed_withdraw_success
			);

			expect(error.code).toBe('swap_failed_withdraw_success');
			expect(error.message).toBe(en.swap.error.swap_failed_withdraw_success);
			expect(error.name).toBe('SwapError');
		});
	});

	describe('Real use-case scenarios', () => {
		it('should handle deposit_error correctly', () => {
			try {
				throwSwapError({ code: 'deposit_error', message: en.swap.error.deposit_error });
			} catch (error) {
				expect((error as SwapError).code).toBe('deposit_error');
				expect((error as SwapError).message).toBe(en.swap.error.deposit_error);
			}
		});

		it('should handle swap_failed_withdraw_success correctly', () => {
			try {
				throwSwapError({
					code: 'swap_failed_withdraw_success',
					message: en.swap.error.swap_failed_withdraw_success
				});
			} catch (error) {
				expect((error as SwapError).code).toBe('swap_failed_withdraw_success');
				expect((error as SwapError).message).toBe(en.swap.error.swap_failed_withdraw_success);
			}
		});

		it('should handle withdraw_failed correctly', () => {
			try {
				throwSwapError({ code: 'withdraw_failed', message: en.swap.error.withdraw_failed });
			} catch (error) {
				expect((error as SwapError).code).toBe('withdraw_failed');
				expect((error as SwapError).message).toBe(en.swap.error.withdraw_failed);
			}
		});
	});
});
