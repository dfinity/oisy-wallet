import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import type { IcpTransaction } from '$icp/types/ic-transaction';
import { ZERO } from '$lib/constants/app.constants';

const mockAccountIdentifier = 'aaaabbbbccccdddd'.repeat(4);

const createMockIcpTransferTransaction = ({
	memo = ZERO,
	icrc1Memo
}: { memo?: bigint; icrc1Memo?: Uint8Array } = {}): IcpTransaction => ({
	id: 1n,
	transaction: {
		memo,
		icrc1_memo: icrc1Memo !== undefined ? [icrc1Memo] : [],
		operation: {
			Transfer: {
				from: mockAccountIdentifier,
				to: mockAccountIdentifier,
				amount: { e8s: 100_000_000n },
				fee: { e8s: 10_000n },
				spender: []
			}
		},
		timestamp: [],
		created_at_time: []
	}
});

describe('icp-transactions.utils', () => {
	describe('mapIcpTransaction', () => {
		it('should include nat64 memo when set for a classic ICP transfer', () => {
			const transaction = createMockIcpTransferTransaction({ memo: 42n });

			const result = mapIcpTransaction({ transaction, identity: undefined });

			expect(result.memo).toBe('42');
		});

		it('should not include memo when nat64 memo is zero (unset)', () => {
			const transaction = createMockIcpTransferTransaction({ memo: ZERO });

			const result = mapIcpTransaction({ transaction, identity: undefined });

			expect(result.memo).toBeUndefined();
		});

		it('should decode and include icrc1_memo as UTF-8 when sending to a principal', () => {
			const memoText = 'payment for invoice #42';
			const icrc1Memo = new TextEncoder().encode(memoText);
			const transaction = createMockIcpTransferTransaction({ icrc1Memo });

			const result = mapIcpTransaction({ transaction, identity: undefined });

			expect(result.memo).toBe(memoText);
		});

		it('should prefer icrc1_memo over nat64 memo when both are present', () => {
			const memoText = 'icrc1 memo takes priority';
			const icrc1Memo = new TextEncoder().encode(memoText);
			const transaction = createMockIcpTransferTransaction({ memo: 99n, icrc1Memo });

			const result = mapIcpTransaction({ transaction, identity: undefined });

			expect(result.memo).toBe(memoText);
		});

		it('should not include memo when neither memo field is set', () => {
			const transaction = createMockIcpTransferTransaction();

			const result = mapIcpTransaction({ transaction, identity: undefined });

			expect(result.memo).toBeUndefined();
		});
	});
});
