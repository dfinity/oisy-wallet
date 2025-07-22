import { SwapError, getSwapErrorMessage, throwSwapError } from '$lib/services/swap-errors.services';
import en from '$tests/mocks/i18n.mock';

describe('SwapError Service', () => {
	describe('getSwapErrorMessage', () => {
		it('should return correct message for deposit_error', () => {
			expect(getSwapErrorMessage('deposit_error')).toBe(en.swap.error.deposit_error);
		});

		it('should return correct message for withdraw_failed', () => {
			expect(getSwapErrorMessage('withdraw_failed')).toBe(en.swap.error.withdraw_failed);
		});

		it('should return correct message for swap_failed_withdraw_success', () => {
			expect(getSwapErrorMessage('swap_failed_withdraw_success')).toBe(
				en.swap.error.swap_failed_withdraw_success
			);
		});
	});

	describe('throwSwapError', () => {
		it('should throw SwapError for deposit_error', () => {
			expect(() => throwSwapError('deposit_error')).toThrow(SwapError);
		});

		it('should throw SwapError for withdraw_failed', () => {
			expect(() => throwSwapError('withdraw_failed')).toThrow(SwapError);
		});

		it('should throw SwapError for swap_failed_withdraw_success', () => {
			expect(() => throwSwapError('swap_failed_withdraw_success')).toThrow(SwapError);
		});

		it('should throw correct error messages', () => {
			expect(() => throwSwapError('deposit_error')).toThrow(en.swap.error.deposit_error);
			expect(() => throwSwapError('withdraw_failed')).toThrow(en.swap.error.withdraw_failed);
			expect(() => throwSwapError('swap_failed_withdraw_success')).toThrow(
				en.swap.error.swap_failed_withdraw_success
			);
		});
	});

	describe('SwapError class', () => {
		it('should be instantiated with deposit_error and correct message', () => {
			const error = new SwapError('deposit_error');

			expect(error.code).toBe('deposit_error');
			expect(error.message).toBe(en.swap.error.deposit_error);
			expect(error.name).toBe('SwapError');
		});

		it('should be instantiated with withdraw_failed and correct message', () => {
			const error = new SwapError('withdraw_failed');

			expect(error.code).toBe('withdraw_failed');
			expect(error.message).toBe(en.swap.error.withdraw_failed);
			expect(error.name).toBe('SwapError');
		});

		it('should be instantiated with swap_failed_withdraw_success and correct message', () => {
			const error = new SwapError('swap_failed_withdraw_success');

			expect(error.code).toBe('swap_failed_withdraw_success');
			expect(error.message).toBe(en.swap.error.swap_failed_withdraw_success);
			expect(error.name).toBe('SwapError');
		});
	});

	describe('Real use-case scenarios', () => {
		it('should handle deposit_error correctly', () => {
			try {
				throwSwapError('deposit_error');
			} catch (error) {
				expect((error as SwapError).code).toBe('deposit_error');
				expect((error as SwapError).message).toBe(en.swap.error.deposit_error);
			}
		});

		it('should handle swap_failed_withdraw_success correctly', () => {
			try {
				throwSwapError('swap_failed_withdraw_success');
			} catch (error) {
				expect((error as SwapError).code).toBe('swap_failed_withdraw_success');
				expect((error as SwapError).message).toBe(en.swap.error.swap_failed_withdraw_success);
			}
		});

		it('should handle withdraw_failed correctly', () => {
			try {
				throwSwapError('withdraw_failed');
			} catch (error) {
				expect((error as SwapError).code).toBe('withdraw_failed');
				expect((error as SwapError).message).toBe(en.swap.error.withdraw_failed);
			}
		});
	});
});
