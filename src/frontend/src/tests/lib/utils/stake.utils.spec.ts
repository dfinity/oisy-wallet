import { GOLDAO_LEDGER_CANISTER_ID } from '$env/tokens/tokens.sns.env';
import type { IcToken } from '$icp/types/ic-token';
import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
import { getGldtStakingTransactions } from '$lib/utils/stake.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';

const mockGldtToken: IcToken = {
	...mockValidIcrcToken,
	id: parseTokenId('GLDT'),
	symbol: 'GLDT',
	ledgerCanisterId: GLDT_STAKE_CANISTER_ID
};

const mockGoldaoToken: IcToken = {
	...mockValidIcrcToken,
	id: parseTokenId('GOLDAO'),
	symbol: 'GOLDAO',
	ledgerCanisterId: GOLDAO_LEDGER_CANISTER_ID
};

describe('getGldtStakingTransactions', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('returns empty array when no stake transactions exist', () => {
		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			icTransactionsStore: {},
			icPendingTransactionsStore: {}
		});

		expect(result).toEqual([]);
	});

	it('returns empty array when both tokens are not available', () => {
		const rewardA = createCertifiedIcTransactionUiMock('rA');
		const rewardB = createCertifiedIcTransactionUiMock('rB');
		rewardA.data.from = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;
		rewardB.data.from = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const result = getGldtStakingTransactions({
			icTransactionsStore: { [mockGldtToken.id]: [], [mockGoldaoToken.id]: [rewardA, rewardB] },
			icPendingTransactionsStore: {}
		});

		expect(result).toHaveLength(0);
		expect(result).toEqual([]);
	});

	it('returns corrext txs if both store and token are available', () => {
		const rewardA = createCertifiedIcTransactionUiMock('rA');
		const rewardB = createCertifiedIcTransactionUiMock('rB');
		rewardA.data.from = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;
		rewardB.data.from = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const result = getGldtStakingTransactions({
			icTransactionsStore: { [mockGldtToken.id]: [], [mockGoldaoToken.id]: [rewardA, rewardB] },
			icPendingTransactionsStore: {},
			goldaoToken: mockGoldaoToken
		});

		expect(result).toHaveLength(2);
		expect(result.every((tx) => tx.isReward)).toBeTruthy();
		expect(result.every((tx) => tx.token === mockGoldaoToken)).toBeTruthy();
	});

	it('classifies direction: GLDT stake execution', () => {
		const tx = createCertifiedIcTransactionUiMock('stake');
		tx.data.to = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			icTransactionsStore: { [mockGldtToken.id]: [tx] },
			icPendingTransactionsStore: {}
		});

		expect(result[0].isReward).toBeFalsy();
		expect(result[0].token).toBe(mockGldtToken);
	});

	it('classifies direction: GOLDAO reward distribution', () => {
		const tx = createCertifiedIcTransactionUiMock('reward');
		tx.data.from = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			icTransactionsStore: { [mockGoldaoToken.id]: [tx] },
			icPendingTransactionsStore: {}
		});

		expect(result[0].isReward).toBeTruthy();
		expect(result[0].token).toBe(mockGoldaoToken);
	});

	it('filters out transactions not involving the stake canister', () => {
		const irrelevant = createCertifiedIcTransactionUiMock('x-nope');
		const related = createCertifiedIcTransactionUiMock('yes');
		related.data.to = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			icTransactionsStore: { [mockGldtToken.id]: [irrelevant], [mockGoldaoToken.id]: [related] },
			icPendingTransactionsStore: {}
		});

		expect(result.map((t) => t.id)).toEqual(['yes']);
	});

	it('preserves order: GLDT first then GOLDAO', () => {
		const gldt1 = createCertifiedIcTransactionUiMock('g1');
		gldt1.data.to = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const gldt2 = createCertifiedIcTransactionUiMock('g2');
		gldt2.data.to = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const gold1 = createCertifiedIcTransactionUiMock('o1');
		gold1.data.from = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			icTransactionsStore: { [mockGldtToken.id]: [gldt1, gldt2], [mockGoldaoToken.id]: [gold1] },
			icPendingTransactionsStore: {}
		});

		expect(result.map((o) => o.id)).toEqual(['g1', 'g2', 'o1']);
	});

	it('supports multiple GOLDAO reward records', () => {
		const rewardA = createCertifiedIcTransactionUiMock('rA');
		const rewardB = createCertifiedIcTransactionUiMock('rB');
		rewardA.data.from = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;
		rewardB.data.from = `${GLDT_STAKE_CANISTER_ID}.300000000000000000000000`;

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			icTransactionsStore: { [mockGldtToken.id]: [], [mockGoldaoToken.id]: [rewardA, rewardB] },
			icPendingTransactionsStore: {}
		});

		expect(result.every((tx) => tx.isReward)).toBeTruthy();
		expect(result.every((tx) => tx.token === mockGoldaoToken)).toBeTruthy();
	});
});
