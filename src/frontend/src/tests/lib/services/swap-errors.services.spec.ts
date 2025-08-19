import { SwapError, throwSwapError } from '$lib/services/swap-errors.services';
import { SwapErrorCodes } from '$lib/types/swap';
import en from '$tests/mocks/i18n.mock';

describe('SwapError Service', () => {
	describe('throwSwapError', () => {
		it('throws SwapError with message', () => {
			expect(() =>
				throwSwapError({
					code: SwapErrorCodes.WITHDRAW_FAILED,
					message: en.swap.error.withdraw_failed,
					variant: 'error'
				})
			).toThrow(SwapError);
		});

		it('throws SwapError without message', () => {
			expect(() =>
				throwSwapError({
					code: SwapErrorCodes.WITHDRAW_FAILED
				})
			).toThrow(SwapError);
		});

		it('throws SwapError without swapSucceded', () => {
			expect(() =>
				throwSwapError({
					code: SwapErrorCodes.WITHDRAW_FAILED
				})
			).toThrow(SwapError);
		});

		it('throws SwapError with swapSucceded', () => {
			expect(() =>
				throwSwapError({
					code: SwapErrorCodes.WITHDRAW_FAILED,
					swapSucceded: true
				})
			).toThrow(SwapError);
		});

		it('throws correct message when provided', () => {
			expect(() =>
				throwSwapError({
					code: SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCCESS,
					message: en.swap.error.swap_failed_withdraw_success
				})
			).toThrow(en.swap.error.swap_failed_withdraw_success);
		});

		it('includes variant if provided', () => {
			try {
				throwSwapError({
					code: SwapErrorCodes.DEPOSIT_FAILED,
					message: en.swap.error.deposit_error,
					variant: 'warning'
				});
			} catch (e) {
				expect(e).toBeInstanceOf(SwapError);
				expect((e as SwapError).variant).toBe('warning');
			}
		});
	});

	describe('SwapError class', () => {
		it('can be created with all fields', () => {
			const error = new SwapError(
				SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCCESS,
				'Withdrawal succeeded manually',
				'info'
			);

			expect(error).toBeInstanceOf(SwapError);
			expect(error.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCCESS);
			expect(error.message).toBe('Withdrawal succeeded manually');
			expect(error.variant).toBe('info');
		});

		it('can be created with only code', () => {
			const error = new SwapError(SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCCESS);

			expect(error).toBeInstanceOf(SwapError);
			expect(error.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCCESS);
			expect(error.message).toBe('');
			expect(error.variant).toBeUndefined();
		});
	});

	describe('Real use-case throw handling', () => {
		it('handles withdraw_failed correctly', () => {
			try {
				throwSwapError({
					code: SwapErrorCodes.WITHDRAW_FAILED,
					message: en.swap.error.withdraw_failed
				});
			} catch (error) {
				expect(error).toBeInstanceOf(SwapError);
				expect((error as SwapError).code).toBe(SwapErrorCodes.WITHDRAW_FAILED);
			}
		});

		it('handles deposit_failed without variant', () => {
			try {
				throwSwapError({
					code: SwapErrorCodes.DEPOSIT_FAILED,
					message: en.swap.error.deposit_error
				});
			} catch (error) {
				expect((error as SwapError).code).toBe(SwapErrorCodes.DEPOSIT_FAILED);
				expect((error as SwapError).variant).toBeUndefined();
			}
		});
	});
});
