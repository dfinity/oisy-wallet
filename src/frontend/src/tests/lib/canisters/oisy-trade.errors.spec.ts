import {
	mapOisyTradeError,
	OisyTradeRequestError,
	OisyTradeTemporaryError,
	OisyTradeUnexpectedError
} from '$lib/canisters/oisy-trade.errors';

describe('oisy-trade.errors', () => {
	describe('mapOisyTradeError', () => {
		it('maps a TemporaryError to a retryable error and keeps the reason', () => {
			const error = mapOisyTradeError({
				kind: { TemporaryError: [{ TradingHalted: null }] },
				message: []
			});

			expect(error).toBeInstanceOf(OisyTradeTemporaryError);
			expect(error.retryable).toBeTruthy();
			expect(error.reason).toBe('TradingHalted');
			// Falls back to the reason discriminant when the canister sends no message.
			expect(error.message).toBe('TradingHalted');
		});

		it('maps a RequestError to a non-retryable error and prefers the canister message', () => {
			const error = mapOisyTradeError({
				kind: { RequestError: [{ AmountExceedsMaximum: null }] },
				message: ['Amount exceeds the maximum supported value']
			});

			expect(error).toBeInstanceOf(OisyTradeRequestError);
			expect(error.retryable).toBeFalsy();
			expect(error.reason).toBe('AmountExceedsMaximum');
			expect(error.message).toBe('Amount exceeds the maximum supported value');
		});

		it('maps an InternalError to a non-retryable unexpected error', () => {
			const error = mapOisyTradeError({ kind: { InternalError: [] }, message: [] });

			expect(error).toBeInstanceOf(OisyTradeUnexpectedError);
			expect(error.retryable).toBeFalsy();
			expect(error.reason).toBe('InternalError');
		});
	});
});
