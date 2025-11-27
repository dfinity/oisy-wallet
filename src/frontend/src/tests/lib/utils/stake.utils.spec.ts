import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import type { IcToken } from '$icp/types/ic-token';
import * as icTxUtils from '$icp/utils/ic-transactions.utils';
import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
import { getGldtStakingTransactions } from '$lib/utils/stake.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';


const mockGldtToken: IcToken = {
	...mockValidIcrcToken,
	id: parseTokenId('GLDT'),
	symbol: 'GLDT',
	ledgerCanisterId: GLDT_LEDGER_CANISTER_ID
};

const mockGoldaoToken: IcToken = {
	...mockValidIcrcToken,
	id: parseTokenId('GOLDAO'),
	symbol: 'GOLDAO',
	ledgerCanisterId: GOLDAO_LEDGER_CANISTER_ID
};

const BASE_INPUT = {
	ckBtcPendingUtxoTransactions: [],
	ckEthPendingTransactions: [],
	icTransactionsStore: { data: [], certified: true },
	btcStatusesStore: { data: undefined, certified: true },
	ckBtcMinterInfoStore: { data: undefined, certified: true },
	ckBtcPendingUtxosStore: { data: undefined, certified: true },
	icExtendedTransactions: [],
	icPendingTransactionsStore: { data: [], certified: true }
};

describe('getStakingTransactions', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns empty array when no stake transactions exist', () => {
		vi.spyOn(icTxUtils, 'getAllIcTransactions')
			.mockReturnValueOnce([]) // GLDT call
			.mockReturnValueOnce([]); // GOLDAO call

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			...BASE_INPUT
		});

		expect(result).toEqual([]);
	});

	it('classifies direction: GLDT stake execution', () => {
		const tx = createCertifiedIcTransactionUiMock('stake');
		tx.data.to = GLDT_STAKE_CANISTER_ID;

		vi.spyOn(icTxUtils, 'getAllIcTransactions').mockReturnValueOnce([tx]).mockReturnValueOnce([]);

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			...BASE_INPUT
		});

		expect(result[0].isReward).toBeFalsy();
		expect(result[0].token).toBe(mockGldtToken);
	});

	it('classifies direction: GOLDAO reward distribution', () => {
		const tx = createCertifiedIcTransactionUiMock('reward');
		tx.data.from = GLDT_STAKE_CANISTER_ID;

		vi.spyOn(icTxUtils, 'getAllIcTransactions').mockReturnValueOnce([]).mockReturnValueOnce([tx]);

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			...BASE_INPUT
		});

		expect(result[0].isReward).toBeTruthy();
		expect(result[0].token).toBe(mockGoldaoToken);
	});

	it('filters out transactions not involving the stake canister', () => {
		const irrelevant = createCertifiedIcTransactionUiMock('x-nope');
		const related = createCertifiedIcTransactionUiMock('yes');
		related.data.to = GLDT_STAKE_CANISTER_ID;

		vi.spyOn(icTxUtils, 'getAllIcTransactions')
			.mockReturnValueOnce([irrelevant])
			.mockReturnValueOnce([related]);

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			...BASE_INPUT
		});

		expect(result.map((t) => t.id)).toEqual(['yes']);
	});

	it('preserves order: GLDT first then GOLDAO', () => {
		const gldt1 = createCertifiedIcTransactionUiMock('g1');
		gldt1.data.to = GLDT_STAKE_CANISTER_ID;

		const gldt2 = createCertifiedIcTransactionUiMock('g2');
		gldt2.data.to = GLDT_STAKE_CANISTER_ID;

		const gold1 = createCertifiedIcTransactionUiMock('o1');
		gold1.data.from = GLDT_STAKE_CANISTER_ID;

		vi.spyOn(icTxUtils, 'getAllIcTransactions')
			.mockReturnValueOnce([gldt1, gldt2]) // GLDT call
			.mockReturnValueOnce([gold1]); // GOLDAO call

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			...BASE_INPUT
		});

		expect(result.map((o) => o.id)).toEqual(['g1', 'g2', 'o1']);
	});

	it('supports multiple GOLDAO reward records', () => {
		const rewardA = createCertifiedIcTransactionUiMock('rA');
		const rewardB = createCertifiedIcTransactionUiMock('rB');
		rewardA.data.from = GLDT_STAKE_CANISTER_ID;
		rewardB.data.from = GLDT_STAKE_CANISTER_ID;

		vi.spyOn(icTxUtils, 'getAllIcTransactions')
			.mockReturnValueOnce([])
			.mockReturnValueOnce([rewardA, rewardB]);

		const result = getGldtStakingTransactions({
			gldtToken: mockGldtToken,
			goldaoToken: mockGoldaoToken,
			...BASE_INPUT
		});

		expect(result.every((tx) => tx.isReward)).toBeTruthy();
		expect(result.every((tx) => tx.token === mockGoldaoToken)).toBeTruthy();
	});
});
