import { EarningCardFields } from '$env/types/env.earning-cards';
import { ZERO } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import {
	liquidiumEarningData,
	liquidiumHealthFactorPercent,
	liquidiumMarkets,
	liquidiumMaxSupplyApy,
	liquidiumNetValueUsd,
	liquidiumPortfolio
} from '$lib/derived/liquidium.derived';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import { liquidiumNetInterestUsd } from '$lib/utils/liquidium.utils';
import { get } from 'svelte/store';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => mockGoto(...args) }));

describe('liquidiumEarningData', () => {
	const portfolio: LiquidiumPortfolio = {
		reserves: [
			{
				poolId: 'pool-btc',
				asset: 'BTC',
				chain: 'BTC',
				supplyApy: 5,
				borrowApy: 0,
				deposited: ZERO,
				depositedDecimals: 8,
				borrowed: ZERO,
				borrowedDecimals: 8,
				suppliedUsd: 1000,
				borrowedUsd: 0
			}
		],
		totalSuppliedUsd: 1000,
		totalBorrowedUsd: 0,
		netValueUsd: 1000,
		availableBorrowsUsd: 0,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 100
	};

	beforeEach(() => {
		mockGoto.mockClear();
		liquidiumStore.reset();
	});

	it('maps markets and portfolio into earning-card fields', () => {
		liquidiumStore.set({
			markets: [
				{
					poolId: 'pool-btc',
					asset: 'BTC',
					chain: 'BTC',
					supplyApy: 5,
					borrowApy: 9,
					frozen: false,
					available: true
				}
			],
			portfolio,
			assetPrices: {}
		});

		const data = get(liquidiumEarningData);
		const balance = get(enabledMainnetFungibleTokensUsdBalance);

		expect(data[EarningCardFields.APY]).toBe(formatStakeApyNumber(5));
		expect(data[EarningCardFields.NETWORKS]).toEqual(expect.arrayContaining([expect.any(String)]));
		expect(data[EarningCardFields.ASSETS]).toEqual(expect.arrayContaining([expect.any(String)]));
		expect(data[EarningCardFields.CURRENT_EARNING]).toBeCloseTo(liquidiumNetInterestUsd(portfolio));
		// Earning potential floors the idle balance at 0, so supplied > balance never goes negative.
		expect(data[EarningCardFields.EARNING_POTENTIAL]).toBeCloseTo(
			(Math.max(0, balance - portfolio.totalSuppliedUsd) * 5) / 100
		);
	});

	it('navigates to the provider page on action', async () => {
		await get(liquidiumEarningData).action();

		expect(mockGoto).toHaveBeenCalledWith(AppPath.ProvidersLiquidium);
	});
});

describe('liquidium derived stores', () => {
	const market = (overrides: Partial<LiquidiumMarket> = {}): LiquidiumMarket => ({
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true,
		...overrides
	});

	const portfolio: LiquidiumPortfolio = {
		reserves: [],
		totalSuppliedUsd: 1200,
		totalBorrowedUsd: 200,
		netValueUsd: 1000,
		availableBorrowsUsd: 0,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 73
	};

	beforeEach(() => {
		liquidiumStore.reset();
	});

	describe('liquidiumMarkets', () => {
		it('reflects the markets in the store', () => {
			const markets = [market()];
			liquidiumStore.set({ markets, portfolio: null, assetPrices: {} });

			expect(get(liquidiumMarkets)).toEqual(markets);
		});

		it('is empty by default', () => {
			expect(get(liquidiumMarkets)).toEqual([]);
		});
	});

	describe('liquidiumPortfolio', () => {
		it('reflects the portfolio in the store', () => {
			liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

			expect(get(liquidiumPortfolio)).toEqual(portfolio);
		});

		it('is null by default', () => {
			expect(get(liquidiumPortfolio)).toBeNull();
		});
	});

	describe('liquidiumMaxSupplyApy', () => {
		it('returns the best APY across available pools', () => {
			liquidiumStore.set({
				markets: [market({ supplyApy: 5 }), market({ poolId: 'pool-eth', supplyApy: 7 })],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumMaxSupplyApy)).toBe(7);
		});

		it('ignores unavailable pools', () => {
			liquidiumStore.set({
				markets: [
					market({ supplyApy: 5 }),
					market({ poolId: 'pool-eth', supplyApy: 9, available: false })
				],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumMaxSupplyApy)).toBe(5);
		});

		it('is 0 when there are no markets', () => {
			expect(get(liquidiumMaxSupplyApy)).toBe(0);
		});
	});

	describe('liquidiumNetValueUsd', () => {
		it('reflects the portfolio net value', () => {
			liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

			expect(get(liquidiumNetValueUsd)).toBe(1000);
		});

		it('is 0 when there is no portfolio', () => {
			expect(get(liquidiumNetValueUsd)).toBe(0);
		});
	});

	describe('liquidiumHealthFactorPercent', () => {
		it('reflects the portfolio health factor', () => {
			liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

			expect(get(liquidiumHealthFactorPercent)).toBe(73);
		});

		it('is null when there is no portfolio', () => {
			expect(get(liquidiumHealthFactorPercent)).toBeNull();
		});
	});
});
