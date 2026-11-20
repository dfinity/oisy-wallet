import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import { EarningCardFields } from '$env/types/env.earning-cards';
import {
	enabledHarvestAutopilotsUsdBalance,
	harvestAutopilots
} from '$eth/derived/harvest-autopilots.derived';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { ZERO } from '$lib/constants/app.constants';
import {
	allEarningPositionsUsd,
	allEarningYearlyAmountUsd,
	earningData,
	earningTopRates,
	earningUninvestedUsd,
	highestApyEarning,
	highestApyEarningData,
	highestEarningPotentialUsd
} from '$lib/derived/earning.derived';
import {
	liquidiumAssetNetworkIcons,
	liquidiumAssetNetworkNames
} from '$lib/derived/liquidium.derived';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import type { TokenUi } from '$lib/types/token-ui';
import type { Vault } from '$lib/types/vaults';
import { get, type Readable } from 'svelte/store';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => mockGoto(...args) }));

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

describe('earning top rates', () => {
	const mockStore = <T>({ store, value }: { store: Readable<T>; value: T }) =>
		vi.spyOn(store, 'subscribe').mockImplementation((fn) => {
			fn(value);
			return () => {};
		});

	const usdtMarket = (chain: string): LiquidiumMarket => ({
		poolId: 'pool-usdt',
		asset: 'USDT',
		chain,
		supplyApy: 6.47,
		borrowApy: 9,
		frozen: false,
		available: true
	});

	const btcMarket: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 1,
		borrowApy: 3,
		frozen: false,
		available: true
	};

	const vault = (apy: string | undefined): Vault => ({
		token: { ...BAUTOPILOT_USDC_TOKEN, enabled: true } as TokenUi<Erc4626CustomToken>,
		apy
	});

	beforeEach(() => {
		vi.restoreAllMocks();
		mockGoto.mockClear();
		liquidiumStore.reset();

		mockStore({ store: enabledMainnetFungibleTokensUsdBalance, value: 1_000 });
		mockStore({ store: enabledHarvestAutopilotsUsdBalance, value: 200 });
		mockStore({ store: harvestAutopilots, value: [] });
	});

	describe('earningUninvestedUsd', () => {
		it('takes the Autopilot vault tokens off the wallet total', () => {
			expect(get(earningUninvestedUsd)).toBe(800);
		});

		it('never goes below 0', () => {
			mockStore({ store: enabledHarvestAutopilotsUsdBalance, value: 2_000 });

			expect(get(earningUninvestedUsd)).toBe(0);
		});
	});

	describe('earningTopRates', () => {
		it('lists one entry per Liquidium pool, with the networks of all its rails', () => {
			liquidiumStore.set({
				markets: [usdtMarket('ETH'), usdtMarket('ICP')],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(earningTopRates)).toEqual([
				{
					id: 'liquidium-pool-usdt',
					providerId: 'liquidium',
					token: USDT_TOKEN,
					symbol: 'USDT',
					networkIcons: get(liquidiumAssetNetworkIcons).USDT,
					networkNames: get(liquidiumAssetNetworkNames).USDT,
					apy: 6.47,
					earningPotentialUsd: (800 * 6.47) / 100,
					action: expect.any(Function)
				}
			]);
		});

		it('lists Autopilot vaults by their underlying asset and network', () => {
			mockStore({ store: harvestAutopilots, value: [vault('5.75')] });

			expect(get(earningTopRates)).toEqual([
				{
					id: `harvest-autopilot-${BAUTOPILOT_USDC_TOKEN.address}`,
					providerId: 'harvest-autopilot',
					token: expect.objectContaining({ address: BAUTOPILOT_USDC_TOKEN.address }),
					symbol: 'USDC',
					networkIcons: [BAUTOPILOT_USDC_TOKEN.network.icon],
					networkNames: [BAUTOPILOT_USDC_TOKEN.network.name],
					apy: 5.75,
					earningPotentialUsd: (800 * 5.75) / 100,
					action: expect.any(Function)
				}
			]);
		});

		it('keeps only rates at or above the threshold, best rate first', () => {
			liquidiumStore.set({
				markets: [btcMarket, usdtMarket('ETH')],
				portfolio: null,
				assetPrices: {}
			});
			mockStore({ store: harvestAutopilots, value: [vault('5.75'), vault(undefined)] });

			expect(get(earningTopRates).map(({ symbol, apy }) => ({ symbol, apy }))).toEqual([
				{ symbol: 'USDT', apy: 6.47 },
				{ symbol: 'USDC', apy: 5.75 }
			]);
		});

		it('leaves out a pool the user borrows from, since it cannot be supplied', () => {
			const portfolio: LiquidiumPortfolio = {
				reserves: [
					{
						poolId: 'pool-usdt',
						asset: 'USDT',
						chain: 'ETH',
						supplyApy: 6.47,
						borrowApy: 9,
						deposited: ZERO,
						depositedDecimals: 6,
						borrowed: 1_000_000n,
						borrowedDecimals: 6,
						suppliedUsd: 0,
						borrowedUsd: 1
					}
				],
				totalSuppliedUsd: 0,
				totalBorrowedUsd: 1,
				netValueUsd: -1,
				availableBorrowsUsd: 0,
				weightedLiquidationThresholdBps: 8000,
				healthFactorPercent: 100
			};

			liquidiumStore.set({ markets: [usdtMarket('ETH')], portfolio, assetPrices: {} });

			expect(get(earningTopRates)).toEqual([]);
		});

		it('opens the Liquidium supply link with where the user started it', async () => {
			liquidiumStore.set({ markets: [usdtMarket('ETH')], portfolio: null, assetPrices: {} });

			const [topRate] = get(earningTopRates);

			await topRate.action(PLAUSIBLE_EVENT_SOURCE_LOCATIONS.EARN);

			expect(mockGoto).toHaveBeenCalledExactlyOnceWith(
				'/providers/liquidium/?supply=USDT&source=earn'
			);
		});

		it('opens the Autopilot vault page', async () => {
			mockStore({ store: harvestAutopilots, value: [vault('5.75')] });

			const [topRate] = get(earningTopRates);

			await topRate.action(PLAUSIBLE_EVENT_SOURCE_LOCATIONS.EARN);

			expect(mockGoto).toHaveBeenCalledExactlyOnceWith(
				`/earn/autopilot/?vault=${BAUTOPILOT_USDC_TOKEN.address}`
			);
		});
	});
});
