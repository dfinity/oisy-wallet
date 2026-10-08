import { EarningCardFields } from '$env/types/env.earning-cards';
import {
	allEarningPositionsUsd,
	allEarningYearlyAmountUsd,
	earningData,
	highestApyEarning,
	highestApyEarningData,
	highestEarningPotentialUsd
} from '$lib/derived/earning.derived';
import { get } from 'svelte/store';

describe('earning.derived', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('earningData', () => {
		it('returns the aggregated data from all providers', () => {
			const result = get(earningData);

			expect(result).toBeDefined();
			expect(typeof result).toBe('object');
		});
	});

	describe('highestApyEarningData', () => {
		it('returns the record with the highest APY', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					'harvest-autopilot': {
						[EarningCardFields.APY]: '10.0',
						[EarningCardFields.CURRENT_STAKED]: 100,
						action: vi.fn()
					}
				});
				return () => {};
			});

			const highest = get(highestApyEarningData);

			expect(highest).toBeDefined();
			expect(highest?.[EarningCardFields.APY]).toBe('10.0');
		});

		it('returns undefined if no earning records exist', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({});
				return () => {};
			});

			expect(get(highestApyEarningData)).toBeUndefined();
		});

		it('ignores records with invalid APY values', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					'harvest-autopilot': {
						[EarningCardFields.APY]: undefined,
						action: vi.fn()
					}
				});
				return () => {};
			});

			expect(get(highestApyEarningData)).toBeUndefined();
		});

		it('correctly compares numeric APY values across multiple records', () => {
			const mockSecondRecord = {
				[EarningCardFields.APY]: '25.0',
				[EarningCardFields.CURRENT_STAKED]: 999,
				action: vi.fn()
			};

			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					'harvest-autopilot': {
						[EarningCardFields.APY]: '10.0',
						action: vi.fn()
					},
					'gold-dao-staking': mockSecondRecord
				});
				return () => {};
			});

			const highest = get(highestApyEarningData);

			expect(highest).toEqual(mockSecondRecord);
		});
	});

	describe('highestApyEarning', () => {
		it('returns the highest APY as a number', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					'harvest-autopilot': {
						[EarningCardFields.APY]: '10.0',
						action: vi.fn()
					}
				});
				return () => {};
			});

			expect(get(highestApyEarning)).toBe(10);
		});

		it('handles missing APY values gracefully', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					'harvest-autopilot': {
						[EarningCardFields.APY]: undefined,
						action: vi.fn()
					}
				});
				return () => {};
			});

			expect(get(highestApyEarning)).toBe(0);
		});

		it('returns 0 when no earning records exist', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({});
				return () => {};
			});

			expect(get(highestApyEarning)).toBe(0);
		});
	});

	describe('highestEarningPotentialUsd', () => {
		it('returns the max earning potential across providers', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					'harvest-autopilot': {
						[EarningCardFields.EARNING_POTENTIAL]: 800,
						action: vi.fn()
					},
					'gold-dao-staking': {
						[EarningCardFields.EARNING_POTENTIAL]: 200,
						action: vi.fn()
					}
				});
				return () => {};
			});

			expect(get(highestEarningPotentialUsd)).toBe(800);
		});

		it('returns 0 when no earning potential is available', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({});
				return () => {};
			});

			expect(get(highestEarningPotentialUsd)).toBe(0);
		});

		it('ignores providers with invalid earning potential', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					'harvest-autopilot': {
						[EarningCardFields.EARNING_POTENTIAL]: undefined,
						action: vi.fn()
					},
					'gold-dao-staking': {
						[EarningCardFields.EARNING_POTENTIAL]: 120,
						action: vi.fn()
					}
				});
				return () => {};
			});

			expect(get(highestEarningPotentialUsd)).toBe(120);
		});
	});

	describe('allEarningPositionsUsd', () => {
		it('sums all valid CURRENT_STAKED values', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { [EarningCardFields.CURRENT_STAKED]: 10, action: async () => {} },
					b: { [EarningCardFields.CURRENT_STAKED]: 20, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningPositionsUsd)).toBe(30);
		});

		it('ignores undefined CURRENT_STAKED', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { action: async () => {} },
					b: { [EarningCardFields.CURRENT_STAKED]: 20, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningPositionsUsd)).toBe(20);
		});

		it('ignores invalid numeric values', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { [EarningCardFields.CURRENT_STAKED]: 'abc', action: async () => {} },
					b: { [EarningCardFields.CURRENT_STAKED]: 10, action: async () => {} }
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

	describe('allEarningYearlyAmountUsd', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
		});

		it('sums all valid CURRENT_EARNING values', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { [EarningCardFields.CURRENT_EARNING]: 100, action: async () => {} },
					b: { [EarningCardFields.CURRENT_EARNING]: 200, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(300);
		});

		it('ignores invalid CURRENT_EARNING values', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { [EarningCardFields.CURRENT_EARNING]: 'abc', action: async () => {} },
					b: { [EarningCardFields.CURRENT_EARNING]: 50, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(50);
		});

		it('ignores entries with undefined CURRENT_EARNING', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { action: async () => {} },
					b: { [EarningCardFields.CURRENT_EARNING]: 20, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(20);
		});

		it('returns 0 when all records are invalid', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { [EarningCardFields.CURRENT_EARNING]: 'nope', action: async () => {} },
					b: { [EarningCardFields.CURRENT_EARNING]: undefined, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(0);
		});

		it('handles mixed valid and invalid entries', () => {
			vi.spyOn(earningData, 'subscribe').mockImplementation((fn) => {
				fn({
					a: { [EarningCardFields.CURRENT_EARNING]: 100, action: async () => {} },
					b: { [EarningCardFields.CURRENT_EARNING]: NaN, action: async () => {} },
					c: { [EarningCardFields.CURRENT_EARNING]: undefined, action: async () => {} },
					d: { [EarningCardFields.CURRENT_EARNING]: 20, action: async () => {} }
				});
				return () => {};
			});

			expect(get(allEarningYearlyAmountUsd)).toBe(120);
		});
	});
});
