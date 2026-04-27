import type { IcrcTransaction } from '$icp/types/ic-transaction';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import {
	createMockIcrcBurnTransaction,
	createMockIcrcMintTransaction,
	createMockIcrcTransferTransaction
} from '$tests/mocks/ic-transactions.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

const mockTimestamp = 1_700_000_000_000_000_000n;

const createMockIcrcApproveTransaction = ({
	id = 400n,
	memo
}: { id?: bigint; memo?: Uint8Array } = {}): IcrcTransaction => ({
	id,
	transaction: {
		kind: 'approve',
		burn: [],
		mint: [],
		approve: [
			{
				amount: 1_000_000n,
				fee: toNullable(10_000n),
				created_at_time: toNullable(mockTimestamp),
				from: { owner: mockPrincipal, subaccount: [] },
				spender: { owner: mockPrincipal2, subaccount: [] },
				expected_allowance: [],
				expires_at: [],
				memo: memo ? [memo] : []
			}
		],
		transfer: [],
		fee_collector: [],
		timestamp: mockTimestamp
	}
});

describe('mapIcrcTransaction', () => {
	describe('memo extraction', () => {
		it('should not include memo when memo is empty on a Transfer', () => {
			const tx = createMockIcrcTransferTransaction();
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBeUndefined();
		});

		it('should include memo decoded as UTF-8 on a Transfer', () => {
			const text = 'hello world';
			const bytes = new TextEncoder().encode(text);
			const tx = createMockIcrcTransferTransaction({ memo: bytes });
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBe(text);
		});

		it('should not include memo when memo decodes to whitespace-only on a Transfer', () => {
			const bytes = new TextEncoder().encode('   ');
			const tx = createMockIcrcTransferTransaction({ memo: bytes });
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBeUndefined();
		});

		it('should include memo decoded as UTF-8 on a Mint', () => {
			const text = 'mint memo';
			const bytes = new TextEncoder().encode(text);
			const tx = createMockIcrcMintTransaction({ memo: bytes });
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBe(text);
		});

		it('should not include memo when memo is empty on a Mint', () => {
			const tx = createMockIcrcMintTransaction();
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBeUndefined();
		});

		it('should include memo decoded as UTF-8 on a Burn', () => {
			const text = 'burn memo';
			const bytes = new TextEncoder().encode(text);
			const tx = createMockIcrcBurnTransaction({ memo: bytes });
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBe(text);
		});

		it('should not include memo when memo is empty on a Burn', () => {
			const tx = createMockIcrcBurnTransaction();
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBeUndefined();
		});

		it('should include memo decoded as UTF-8 on an Approve', () => {
			const text = 'approve memo';
			const bytes = new TextEncoder().encode(text);
			const tx = createMockIcrcApproveTransaction({ memo: bytes });
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBe(text);
		});

		it('should not include memo when memo is empty on an Approve', () => {
			const tx = createMockIcrcApproveTransaction();
			const result = mapIcrcTransaction({
				transaction: tx,
				identity: mockIdentity
			});

			expect(result.memo).toBeUndefined();
		});
	});
});
