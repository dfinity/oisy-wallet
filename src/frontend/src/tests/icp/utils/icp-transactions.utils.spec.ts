import { ICP_EXPLORER_URL } from '$env/explorers.env';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockAccountIdentifierText, mockIdentity } from '$tests/mocks/identity.mock';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

const mockTimestamp = 1_700_000_000_000_000_000n;
const mockFrom = mockAccountIdentifierText;
const mockTo = '2265390ecb68ef1db64c47528d678ffb469fd6b31b402424882aefcf7ef538b2';

const baseTransaction: IcpIndexDid.Transaction = {
	memo: ZERO,
	icrc1_memo: [],
	timestamp: [{ timestamp_nanos: mockTimestamp }],
	created_at_time: [],
	operation: {
		Transfer: {
			from: mockFrom,
			to: mockTo,
			amount: { e8s: 1_000_000n },
			fee: { e8s: 10_000n },
			spender: []
		}
	}
};

const makeTransaction = (
	overrides: Partial<IcpIndexDid.Transaction> = {}
): { transaction: IcpIndexDid.Transaction; id: bigint } => ({
	id: 42n,
	transaction: { ...baseTransaction, ...overrides }
});

describe('mapIcpTransaction', () => {
	describe('memo extraction', () => {
		it('should not include memo when memo is 0n and icrc1_memo is empty', () => {
			const { transaction, id } = makeTransaction({ memo: ZERO, icrc1_memo: [] });
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBeUndefined();
		});

		it('should include nat64 memo as string when memo is non-zero', () => {
			const { transaction, id } = makeTransaction({ memo: 12345n, icrc1_memo: [] });
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBe('12345');
		});

		it('should include icrc1_memo decoded as UTF-8 text when present', () => {
			const text = 'hello world';
			const bytes = new TextEncoder().encode(text);
			const { transaction, id } = makeTransaction({ memo: ZERO, icrc1_memo: [bytes] });
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBe(text);
		});

		it('should prefer icrc1_memo over nat64 memo when both are present', () => {
			const text = 'icrc1 memo';
			const bytes = new TextEncoder().encode(text);
			const { transaction, id } = makeTransaction({ memo: 999n, icrc1_memo: [bytes] });
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBe(text);
		});

		it('should not include memo when icrc1_memo decodes to whitespace-only', () => {
			const bytes = new TextEncoder().encode('   ');
			const { transaction, id } = makeTransaction({ memo: ZERO, icrc1_memo: [bytes] });
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBeUndefined();
		});

		it('should propagate memo to Burn transactions', () => {
			const { transaction, id } = makeTransaction({
				memo: 7n,
				icrc1_memo: [],
				operation: {
					Burn: { from: mockFrom, amount: { e8s: 500_000n }, spender: [] }
				}
			});
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBe('7');
		});

		it('should propagate memo to Mint transactions', () => {
			const { transaction, id } = makeTransaction({
				memo: 8n,
				icrc1_memo: [],
				operation: {
					Mint: { to: mockTo, amount: { e8s: 200_000n } }
				}
			});
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBe('8');
		});

		it('should propagate memo to Approve transactions', () => {
			const { transaction, id } = makeTransaction({
				memo: 9n,
				icrc1_memo: [],
				operation: {
					Approve: {
						from: mockFrom,
						allowance: { e8s: 1_000_000n },
						fee: { e8s: 10_000n },
						expected_allowance: [],
						expires_at: [],
						spender: mockTo
					}
				}
			});
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBe('9');
		});

		it('should propagate memo to Transfer transactions', () => {
			const { transaction, id } = makeTransaction({ memo: 42n, icrc1_memo: [] });
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.memo).toBe('42');
		});
	});

	describe('basic mapping', () => {
		it('should map id and timestamp', () => {
			const { transaction, id } = makeTransaction();
			const result = mapIcpTransaction({
				transaction: { transaction, id },
				identity: mockIdentity
			});
			expect(result.id).toBe('42');
			expect(result.timestamp).toBe(mockTimestamp);
			expect(result.status).toBe('executed');
			expect(result.txExplorerUrl).toBe(`${ICP_EXPLORER_URL}/transaction/42`);
		});
	});
});
