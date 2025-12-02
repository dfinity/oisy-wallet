import type { StakePositionResponse } from '$declarations/gldt_stake/gldt_stake.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { EarningCardFields } from '$env/types/env.earning-cards';
import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import {
	allEarningPositionsUsd,
	allEarningYearlyAmountUsd,
	earningData,
	highestApyEarning,
	highestApyEarningData,
	highestEarningPotentialUsd
} from '$lib/derived/earning.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import { i18n } from '$lib/stores/i18n.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

const mockGldtToken = {
	id: parseTokenId('GOLDAO'),
	symbol: 'GLDT',
	name: 'Gold DAO Token',
	decimals: 8,
	network: ICP_NETWORK,
	address: '0xabc',
	enabled: true,
	standard: 'icrc',
	ledgerCanisterId: GLDT_LEDGER_CANISTER_ID
} as unknown as IcrcCustomToken;

describe('earning.derived', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		setupTestnetsStore('reset');
		setupUserNetworksStore('allEnabled');

		gldtStakeStore.reset();

		icrcCustomTokensStore.resetAll();
		icrcCustomTokensStore.set({ data: mockGldtToken, certified: true });

		balancesStore.reset(ICP_TOKEN.id);
		balancesStore.set({
			id: ICP_TOKEN.id,
			data: { data: 100_000_000_000n, certified: true }
		});

		exchangeStore.reset();
		exchangeStore.set([
			{ 'internet-computer': { usd: 1 } },
			{ [mockGldtToken.ledgerCanisterId]: { usd: 1 } }
		]);
	});

	describe('earningData', () => {
		it('correctly formatted values for GLDT', () => {
			gldtStakeStore.setApy(10);
			gldtStakeStore.setPosition({ staked: 1000000000n } as unknown as StakePositionResponse);

			const result = get(earningData);

			const record = result['gldt-staking'];

			expect(record[EarningCardFields.APY]).toBe('10.0');
			expect(record[EarningCardFields.CURRENT_STAKED]).toBe('10 GLDT');
			expect(record[EarningCardFields.CURRENT_EARNING]).toBe(10);
			expect(record[EarningCardFields.EARNING_POTENTIAL]).toBe(100);
			expect(record[EarningCardFields.TERMS]).toBe(get(i18n).earning.terms.flexible);

			expect(typeof record.action).toBe('function');
		});

		it('handles missing GLDT APY', () => {
			gldtStakeStore.setApy(undefined as unknown as number);
			gldtStakeStore.setPosition({ staked: 1000000000n } as unknown as StakePositionResponse);

			const result = get(earningData);
			const rec = result['gldt-staking'];

			expect(rec[EarningCardFields.APY]).toBeUndefined();
			expect(rec[EarningCardFields.EARNING_POTENTIAL]).toBeUndefined();
		});

		it('handles missing GLDT token gracefully', () => {
			icrcCustomTokensStore.resetAll();

			const result = get(earningData);
			const rec = result['gldt-staking'];

			expect(rec[EarningCardFields.CURRENT_STAKED]).toBeUndefined();
			expect(rec[EarningCardFields.CURRENT_EARNING]).toBeUndefined();
		});
	});

	describe('highestApyEarningData', () => {
		it('returns the record with the highest APY', () => {
			gldtStakeStore.setApy(10);
			gldtStakeStore.setPosition({ staked: 1000000000n } as unknown as StakePositionResponse);

			const highest = get(highestApyEarningData);

			expect(highest).toBeDefined();
			expect(highest?.[EarningCardFields.APY]).toBe('10.0');
		});

		it('returns undefined if no earning records exist', () => {
			icrcCustomTokensStore.resetAll();
			gldtStakeStore.reset();

			const highest = get(highestApyEarningData);

			expect(highest).toBeUndefined();
		});

		it('ignores records with invalid APY values', () => {
			gldtStakeStore.setApy(undefined as unknown as number);
			gldtStakeStore.setPosition({ staked: 1000000000n } as unknown as StakePositionResponse);

			const highest = get(highestApyEarningData);

			expect(highest).toBeUndefined();
		});

		it('correctly compares numeric APY values across multiple records', () => {
			const mockSecondRecord = {
				[EarningCardFields.APY]: '25.0',
				[EarningCardFields.CURRENT_STAKED]: '999 GLDT',
				action: vi.fn()
			};

			const originalEarningData = earningData.subscribe;

			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					'gldt-staking': {
						[EarningCardFields.APY]: '10.0',
						action: vi.fn()
					},
					'other-earning': mockSecondRecord
				});
				return () => {};
			});

			const highest = get(highestApyEarningData);

			expect(highest).toEqual(mockSecondRecord);

			vi.spyOn(earningData, 'subscribe').mockImplementation(originalEarningData);
		});
	});

	describe('highestApyEarning', () => {
		const mockApy = 10;

		beforeEach(() => {
			vi.clearAllMocks();

			gldtStakeStore.reset();
		});

		it('returns the highest APY', () => {
			gldtStakeStore.setApy(mockApy);
			gldtStakeStore.setPosition({ staked: 1000000000n } as unknown as StakePositionResponse);

			expect(get(highestApyEarning)).toBe(mockApy);
		});

		it('handles missing APY values gracefully', () => {
			gldtStakeStore.setApy(undefined as unknown as number);
			gldtStakeStore.setPosition({ staked: 1000000000n } as unknown as StakePositionResponse);

			expect(get(highestApyEarning)).toBe(0);
		});

		it('handles missing earning records', () => {
			gldtStakeStore.reset();

			expect(get(highestApyEarning)).toBe(0);
		});
	});

	describe('highestEarningPotentialUsd', () => {
		const mockTotalBalance = 12_345_600_000_000n;
		const mockApy = 10;
		const expectedEarningPotential = (123_456 * mockApy) / 100;

		beforeEach(() => {
			vi.clearAllMocks();

			gldtStakeStore.reset();

			gldtStakeStore.setApy(mockApy);
			gldtStakeStore.setPosition({ staked: 123n } as unknown as StakePositionResponse);

			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: mockTotalBalance, certified: true }
			});
		});

		it('returns the highest earning potential in USD', () => {
			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: mockTotalBalance, certified: true }
			});

			expect(get(highestEarningPotentialUsd)).toBe(expectedEarningPotential);
		});

		it('handles a null APY', () => {
			gldtStakeStore.setApy(0);

			expect(get(highestEarningPotentialUsd)).toBe(0);
		});

		it('handles a null balance', () => {
			balancesStore.reset(ICP_TOKEN.id);

			expect(get(highestEarningPotentialUsd)).toBe(0);
		});
	});

	describe('allEarningPositionsUsd', () => {
		it('sums all valid CURRENT_EARNING values', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { [EarningCardFields.CURRENT_EARNING]: 10, action: async () => {} },
					b: { [EarningCardFields.CURRENT_EARNING]: 20, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningPositionsUsd)).toBe(30);
		});

		it('ignores undefined CURRENT_EARNING', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { action: async () => {} },
					b: { [EarningCardFields.CURRENT_EARNING]: 20, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningPositionsUsd)).toBe(20);
		});

		it('ignores invalid numeric values', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { [EarningCardFields.CURRENT_EARNING]: 'abc', action: async () => {} },
					b: { [EarningCardFields.CURRENT_EARNING]: 10, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningPositionsUsd)).toBe(10);
		});

		it('returns 0 for empty earning data', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({});
				return () => {};
			});

			expect(get(allEarningPositionsUsd)).toBe(0);
		});
	});

	describe('allEarningYearlyAmountUsd (mocked subscribe)', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
		});

		it('computes yearly earning correctly from valid entries', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: {
						[EarningCardFields.CURRENT_EARNING]: 100,
						[EarningCardFields.APY]: 10,
						action: async () => {}
					},
					b: {
						[EarningCardFields.CURRENT_EARNING]: 200,
						[EarningCardFields.APY]: 5,
						action: async () => {}
					}
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(20);
		});

		it('ignores invalid CURRENT_EARNING values', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: {
						[EarningCardFields.CURRENT_EARNING]: 'abc', // invalid
						[EarningCardFields.APY]: 10,
						action: async () => {}
					},
					b: {
						[EarningCardFields.CURRENT_EARNING]: 50,
						[EarningCardFields.APY]: 20,
						action: async () => {}
					}
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(10);
		});

		it('ignores entries with missing APY', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: {
						[EarningCardFields.CURRENT_EARNING]: 100,
						action: async () => {}
					},
					b: {
						[EarningCardFields.CURRENT_EARNING]: 20,
						[EarningCardFields.APY]: 10,
						action: async () => {}
					}
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(2);
		});

		it('returns 0 when all records are invalid', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: {
						[EarningCardFields.CURRENT_EARNING]: 'nope',
						[EarningCardFields.APY]: 'bad',
						action: async () => {}
					},
					b: {
						[EarningCardFields.CURRENT_EARNING]: undefined,
						[EarningCardFields.APY]: undefined,
						action: async () => {}
					}
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(0);
		});

		it('handles mixed valid + invalid entries', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: {
						[EarningCardFields.CURRENT_EARNING]: 100,
						[EarningCardFields.APY]: 10,
						action: async () => {}
					},
					b: {
						[EarningCardFields.CURRENT_EARNING]: NaN,
						[EarningCardFields.APY]: 20,
						action: async () => {}
					},
					c: {
						[EarningCardFields.CURRENT_EARNING]: 50,
						[EarningCardFields.APY]: undefined,
						action: async () => {}
					},
					d: {
						[EarningCardFields.CURRENT_EARNING]: 20,
						[EarningCardFields.APY]: 20,
						action: async () => {}
					}
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(14);
		});
	});
});
