import {
	CmcNotifyInvalidTransactionError,
	CmcNotifyOtherError,
	CmcNotifyProcessingError,
	CmcNotifyRefundedError,
	CmcNotifyTransactionTooOldError,
	mapCmcNotifyError
} from '$icp/canisters/cmc.errors';

describe('cmc.errors', () => {
	describe('mapCmcNotifyError', () => {
		it('should map Processing to a retryable error', () => {
			const err = mapCmcNotifyError({ Processing: null });

			expect(err).toBeInstanceOf(CmcNotifyProcessingError);
			expect(err.retryable).toBeTruthy();
		});

		it('should map Refunded to a final error carrying the refund block and reason', () => {
			const err = mapCmcNotifyError({
				Refunded: { block_index: [42n], reason: 'Cycles minting limit reached' }
			});

			expect(err).toBeInstanceOf(CmcNotifyRefundedError);
			expect(err.retryable).toBeFalsy();
			expect(err.message).toBe('Cycles minting limit reached');
			expect((err as CmcNotifyRefundedError).refundBlockIndex).toBe(42n);
		});

		it('should map a Refunded without a refund block', () => {
			const err = mapCmcNotifyError({ Refunded: { block_index: [], reason: 'Too small' } });

			expect((err as CmcNotifyRefundedError).refundBlockIndex).toBeUndefined();
		});

		it('should map TransactionTooOld to a final error carrying the oldest processable block', () => {
			const err = mapCmcNotifyError({ TransactionTooOld: 1_000n });

			expect(err).toBeInstanceOf(CmcNotifyTransactionTooOldError);
			expect(err.retryable).toBeFalsy();
			expect((err as CmcNotifyTransactionTooOldError).oldestProcessableBlockIndex).toBe(1_000n);
		});

		it('should map InvalidTransaction to a final error', () => {
			const err = mapCmcNotifyError({ InvalidTransaction: 'Wrong memo' });

			expect(err).toBeInstanceOf(CmcNotifyInvalidTransactionError);
			expect(err.retryable).toBeFalsy();
			expect(err.message).toBe('Wrong memo');
		});

		it.each([1n, 2n, 3n])('should treat the transient Other code %s as retryable', (code) => {
			const err = mapCmcNotifyError({ Other: { error_code: code, error_message: 'transient' } });

			expect(err).toBeInstanceOf(CmcNotifyOtherError);
			expect(err.retryable).toBeTruthy();
			expect((err as CmcNotifyOtherError).errorCode).toBe(code);
		});

		it.each([4n, 5n, 6n, 99n])('should treat the Other code %s as final', (code) => {
			const err = mapCmcNotifyError({ Other: { error_code: code, error_message: 'final' } });

			expect(err).toBeInstanceOf(CmcNotifyOtherError);
			expect(err.retryable).toBeFalsy();
			expect(err.message).toBe('final');
		});
	});
});
