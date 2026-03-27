import { EarningCardFields } from '$env/types/env.earning-cards';
import {
	enabledHarvestAutopilotsUsdBalance,
	harvestAutopilots,
	harvestAutopilotsCurrentEarning,
	harvestAutopilotsMaxApy,
	harvestAutopilotsUsdBalance
} from '$eth/derived/harvest-autopilots.derived';
import {
	allEarningPositionsUsd,
	allEarningYearlyAmountUsd,
	earningData,
	highestApyEarning,
	highestApyEarningData,
	highestEarningPotentialUsd
} from '$lib/derived/earning.derived';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { get } from 'svelte/store';

describe('earning.derived', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('earningData', () => {
		const setupStores = ({
			enabledMainnetUsdBalance = 1000,
			harvestUsdBalance = 100,
			enabledHarvestUsdBalance = 100,
			currentEarning = 5,
			vaults = [{ token: { network: { icon: 'eth-icon' }, assetIcon: 'usdc-icon' } }],
			maxApy = '5.5'
		}: {
			enabledMainnetUsdBalance?: number | null;
			harvestUsdBalance?: number;
			enabledHarvestUsdBalance?: number;
			currentEarning?: number;
			vaults?: { token: { network: { icon?: string }; assetIcon?: string } }[];
			maxApy?: string;
		} = {}) => {
			vi.spyOn(enabledMainnetFungibleTokensUsdBalance, 'subscribe').mockImplementation((fn) => {
				fn(enabledMainnetUsdBalance as number);
				return () => {};
			});
			vi.spyOn(harvestAutopilotsUsdBalance, 'subscribe').mockImplementation((fn) => {
				fn(harvestUsdBalance);
				return () => {};
			});
			vi.spyOn(enabledHarvestAutopilotsUsdBalance, 'subscribe').mockImplementation((fn) => {
				fn(enabledHarvestUsdBalance);
				return () => {};
			});
			vi.spyOn(harvestAutopilotsCurrentEarning, 'subscribe').mockImplementation((fn) => {
				fn(currentEarning);
				return () => {};
			});
			vi.spyOn(harvestAutopilots, 'subscribe').mockImplementation((fn) => {
				fn(vaults as never);
				return () => {};
			});
			vi.spyOn(harvestAutopilotsMaxApy, 'subscribe').mockImplementation((fn) => {
				fn(maxApy);
				return () => {};
			});
		};

		it('returns correctly structured harvest-autopilot record', () => {
			setupStores();

			const result = get(earningData);
			const record = result['harvest-autopilot'];

			expect(record[EarningCardFields.APY]).toBe('5.5');
			expect(record[EarningCardFields.CURRENT_STAKED]).toBe(100);
			expect(record[EarningCardFields.CURRENT_EARNING]).toBe(5);
			expect(record[EarningCardFields.NETWORKS]).toEqual(['eth-icon']);
			expect(record[EarningCardFields.ASSETS]).toEqual(['usdc-icon']);
		});

		it('calculates earning potential correctly', () => {
			setupStores({
				enabledMainnetUsdBalance: 10000,
				enabledHarvestUsdBalance: 2000,
				maxApy: '10.0'
			});

			const result = get(earningData);
			const record = result['harvest-autopilot'];

			// (10000 - 2000) * 10.0 / 100 = 800
			expect(record[EarningCardFields.EARNING_POTENTIAL]).toBe(800);
		});

		it('returns undefined earning potential when mainnet balance is nullish', () => {
			setupStores({
				enabledMainnetUsdBalance: null
			});

			const result = get(earningData);
			const record = result['harvest-autopilot'];

			expect(record[EarningCardFields.EARNING_POTENTIAL]).toBeUndefined();
		});

		it('deduplicates network and asset icons', () => {
			setupStores({
				vaults: [
					{ token: { network: { icon: 'eth-icon' }, assetIcon: 'usdc-icon' } },
					{ token: { network: { icon: 'eth-icon' }, assetIcon: 'usdc-icon' } },
					{ token: { network: { icon: 'base-icon' }, assetIcon: 'usdt-icon' } }
				]
			});

			const result = get(earningData);
			const record = result['harvest-autopilot'];

			expect(record[EarningCardFields.NETWORKS]).toEqual(['eth-icon', 'base-icon']);
			expect(record[EarningCardFields.ASSETS]).toEqual(['usdc-icon', 'usdt-icon']);
		});

		it('excludes nullish icons from networks and assets', () => {
			setupStores({
				vaults: [
					{ token: { network: { icon: 'eth-icon' }, assetIcon: undefined } },
					{ token: { network: { icon: undefined }, assetIcon: 'usdc-icon' } }
				]
			});

			const result = get(earningData);
			const record = result['harvest-autopilot'];

			expect(record[EarningCardFields.NETWORKS]).toEqual(['eth-icon']);
			expect(record[EarningCardFields.ASSETS]).toEqual(['usdc-icon']);
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
					'other-earning': mockSecondRecord
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
		const setupStores = ({ apy = 10, mainnetBalance = 1000, harvestBalance = 0 } = {}) => {
			vi.spyOn(highestApyEarning, 'subscribe').mockImplementation((fn) => {
				fn(apy);
				return () => {};
			});
			vi.spyOn(enabledMainnetFungibleTokensUsdBalance, 'subscribe').mockImplementation((fn) => {
				fn(mainnetBalance);
				return () => {};
			});
			vi.spyOn(enabledHarvestAutopilotsUsdBalance, 'subscribe').mockImplementation((fn) => {
				fn(harvestBalance);
				return () => {};
			});
		};

		it('returns the highest earning potential in USD', () => {
			setupStores({ mainnetBalance: 123456 });

			// (123456 - 0) * 10 / 100 = 12345.6
			expect(get(highestEarningPotentialUsd)).toBe(12345.6);
		});

		it('subtracts enabled harvest autopilot balance', () => {
			setupStores({ mainnetBalance: 1000, harvestBalance: 200 });

			// (1000 - 200) * 10 / 100 = 80
			expect(get(highestEarningPotentialUsd)).toBe(80);
		});

		it('handles a zero APY', () => {
			setupStores({ apy: 0 });

			expect(get(highestEarningPotentialUsd)).toBe(0);
		});

		it('handles a zero balance', () => {
			setupStores({ mainnetBalance: 0 });

			expect(get(highestEarningPotentialUsd)).toBe(0);
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
