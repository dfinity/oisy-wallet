import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import {
	createMockIcrcMintTransaction,
	createMockIcrcTransferTransaction
} from '$tests/mocks/ic-transactions.mock';

describe('icrc-transactions.utils', () => {
	describe('mapIcrcTransaction', () => {
		it('should decode and include memo from a transfer transaction', () => {
			const memoText = 'payment for invoice #42';
			const memoBytes = new TextEncoder().encode(memoText);

			const transaction = createMockIcrcTransferTransaction({ memo: memoBytes });

			const result = mapIcrcTransaction({ transaction, identity: undefined });

			expect(result.memo).toBe(memoText);
		});

		it('should not include memo when transfer has no memo', () => {
			const transaction = createMockIcrcTransferTransaction();

			const result = mapIcrcTransaction({ transaction, identity: undefined });

			expect(result.memo).toBeUndefined();
		});

		it('should not include memo for non-transfer transactions (mint)', () => {
			const transaction = createMockIcrcMintTransaction();

			const result = mapIcrcTransaction({ transaction, identity: undefined });

			expect(result.memo).toBeUndefined();
		});
	});
});
