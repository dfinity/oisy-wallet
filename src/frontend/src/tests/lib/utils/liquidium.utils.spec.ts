import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import {
	liquidiumFreeCollateralUsd,
	liquidiumHealthFactorPercent,
	liquidiumHealthLevel,
	liquidiumMaxSupplyApy,
	liquidiumNetApy,
	liquidiumNetInterestUsd,
	liquidiumProjectedHealthAfterWithdrawPercent,
	liquidiumProjectedHealthPercent,
	liquidiumResultingLtvPercent,
	mapLiquidiumMarket,
	mapLiquidiumPortfolio,
	mapLiquidiumReserve
} from '$lib/utils/liquidium.utils';
import {
	RATE_SCALE,
	type Pool,
	type Position,
	type UserPositionSummary,
	type UserReserve
} from '@liquidium/client';

// rateDecimals = 2 keeps the scaled rate fixtures readable (5n → 5%).
const buildPool = (overrides: Partial<Pool> = {}): Pool => ({
	id: 'pool-btc',
	asset: 'BTC',
	chain: 'BTC',
	decimals: 8n,
	frozen: false,
	totalSupply: ZERO,
	totalDebt: ZERO,
	availableLiquidity: ZERO,
	maxLtv: ZERO,
	liquidationThreshold: ZERO,
	liquidationBonus: ZERO,
	protocolLiquidationFee: ZERO,
	reserveFactor: ZERO,
	rateDecimals: 2n,
	lendingRate: 5n,
	borrowingRate: 9n,
	utilizationRate: ZERO,
	baseRate: ZERO,
	optimalUtilizationRate: ZERO,
	rateSlopeBefore: ZERO,
	rateSlopeAfter: ZERO,
	lendingIndex: ZERO,
	borrowIndex: ZERO,
	sameAssetBorrowing: false,
	...overrides
});

const buildPosition = (overrides: Partial<Position> = {}): Position => ({
	poolId: 'pool-btc',
	asset: 'BTC',
	deposited: 100_000_000n,
	depositedDecimals: 8n,
	borrowed: ZERO,
	borrowedDecimals: 8n,
	earnedInterest: ZERO,
	debtInterest: ZERO,
	lastUpdate: ZERO,
	...overrides
});

// healthFactor is scaled by RATE_SCALE: 60% → 0.6 * RATE_SCALE.
const scaledHealth = (percent: bigint): bigint => (percent * RATE_SCALE) / 100n;

describe('liquidium.utils', () => {
	describe('mapLiquidiumMarket', () => {
		it('maps rates to percentages and reports availability', () => {
			expect(mapLiquidiumMarket(buildPool())).toEqual({
				poolId: 'pool-btc',
				asset: 'BTC',
				chain: 'BTC',
				supplyApy: expect.closeTo(5),
				borrowApy: expect.closeTo(9),
				frozen: false,
				available: true
			});
		});

		it('is unavailable when frozen', () => {
			expect(mapLiquidiumMarket(buildPool({ frozen: true })).available).toBeFalsy();
		});

		it('is unavailable at or above the supply cap', () => {
			expect(
				mapLiquidiumMarket(buildPool({ totalSupply: 100n, supplyCap: 100n })).available
			).toBeFalsy();
			expect(
				mapLiquidiumMarket(buildPool({ totalSupply: 50n, supplyCap: 100n })).available
			).toBeTruthy();
		});
	});

	describe('liquidiumMaxSupplyApy', () => {
		it('returns the best APY across available pools, ignoring unavailable ones', () => {
			const markets = [
				mapLiquidiumMarket(buildPool({ id: 'a', lendingRate: 3n })),
				mapLiquidiumMarket(buildPool({ id: 'b', lendingRate: 7n })),
				mapLiquidiumMarket(buildPool({ id: 'c', lendingRate: 9n, frozen: true }))
			];

			expect(liquidiumMaxSupplyApy(markets)).toBeCloseTo(7);
		});

		it('returns 0 when there are no markets', () => {
			expect(liquidiumMaxSupplyApy([])).toBe(0);
		});
	});

	describe('liquidiumHealthFactorPercent', () => {
		it('is (1 − LTV / liquidationThreshold) × 100', () => {
			// LTV 40%, liquidation threshold 80% → 50%.
			expect(
				liquidiumHealthFactorPercent({
					currentLtvBps: 4_000n,
					weightedLiquidationThresholdBps: 8_000n
				})
			).toBeCloseTo(50);
		});

		it('is 100 with no debt (LTV 0)', () => {
			expect(
				liquidiumHealthFactorPercent({
					currentLtvBps: ZERO,
					weightedLiquidationThresholdBps: 8_000n
				})
			).toBe(100);
		});

		it('is 100 when there are no positions (zero debt and zero threshold)', () => {
			expect(
				liquidiumHealthFactorPercent({ currentLtvBps: ZERO, weightedLiquidationThresholdBps: ZERO })
			).toBe(100);
		});

		it('is 0 when there is debt but no threshold (bad/edge payload)', () => {
			expect(
				liquidiumHealthFactorPercent({
					currentLtvBps: 4_000n,
					weightedLiquidationThresholdBps: ZERO
				})
			).toBe(0);
		});

		it('clamps to 0 at/above the liquidation threshold', () => {
			expect(
				liquidiumHealthFactorPercent({
					currentLtvBps: 8_000n,
					weightedLiquidationThresholdBps: 8_000n
				})
			).toBe(0);
		});
	});

	describe('liquidiumHealthLevel', () => {
		it.each([
			{ percent: 100, level: 'healthy' },
			{ percent: 50, level: 'healthy' },
			{ percent: 49.9, level: 'at-risk' },
			{ percent: 15, level: 'at-risk' },
			{ percent: 14.9, level: 'critical' },
			{ percent: 0, level: 'critical' }
		])('classifies $percent% as $level', ({ percent, level }) => {
			expect(liquidiumHealthLevel(percent)).toBe(level);
		});
	});

	describe('liquidiumResultingLtvPercent', () => {
		it('is (totalDebt + newBorrow) / totalCollateral × 100', () => {
			expect(
				liquidiumResultingLtvPercent({
					totalDebtUsd: 0,
					newBorrowUsd: 20_000,
					totalCollateralUsd: 67_170
				})
			).toBeCloseTo(29.77, 1);
		});

		it('includes existing debt', () => {
			expect(
				liquidiumResultingLtvPercent({
					totalDebtUsd: 10_000,
					newBorrowUsd: 10_000,
					totalCollateralUsd: 100_000
				})
			).toBeCloseTo(20);
		});

		it('is 0 with no collateral', () => {
			expect(
				liquidiumResultingLtvPercent({ totalDebtUsd: 0, newBorrowUsd: 100, totalCollateralUsd: 0 })
			).toBe(0);
		});
	});

	describe('liquidiumProjectedHealthPercent', () => {
		it('returns the current health unchanged for a zero borrow', () => {
			expect(
				liquidiumProjectedHealthPercent({
					currentHealthPercent: 100,
					newBorrowUsd: 0,
					totalCollateralUsd: 67_170,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(100);
		});

		it('subtracts the marginal effect of the new debt (anchored on current health)', () => {
			// No debt (100%), borrow $20k against $67,170 collateral at 80% threshold:
			// 100 − (20000 / (67170 × 0.8)) × 100 ≈ 62.8%.
			expect(
				liquidiumProjectedHealthPercent({
					currentHealthPercent: 100,
					newBorrowUsd: 20_000,
					totalCollateralUsd: 67_170,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBeCloseTo(62.78, 1);
		});

		it('clamps to 0 when the borrow would exhaust the buffer', () => {
			expect(
				liquidiumProjectedHealthPercent({
					currentHealthPercent: 100,
					newBorrowUsd: 100_000,
					totalCollateralUsd: 67_170,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(0);
		});

		it('is 0 with no collateral or a zero threshold', () => {
			expect(
				liquidiumProjectedHealthPercent({
					currentHealthPercent: 100,
					newBorrowUsd: 0,
					totalCollateralUsd: 0,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(0);
			expect(
				liquidiumProjectedHealthPercent({
					currentHealthPercent: 100,
					newBorrowUsd: 0,
					totalCollateralUsd: 100,
					weightedLiquidationThresholdBps: 0
				})
			).toBe(0);
		});
	});

	describe('liquidiumFreeCollateralUsd', () => {
		it('returns the full collateral when there is no debt', () => {
			expect(
				liquidiumFreeCollateralUsd({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 0,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(100_000);
		});

		it('subtracts the collateral pledged to debt at the liquidation threshold', () => {
			// debt $20k at 0.8 → reserved 25k → free 75k.
			expect(
				liquidiumFreeCollateralUsd({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 20_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBeCloseTo(75_000, 5);
		});

		it('clamps to 0 and treats debt with a zero threshold as fully reserved', () => {
			expect(
				liquidiumFreeCollateralUsd({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 90_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(0);
			expect(
				liquidiumFreeCollateralUsd({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 10_000,
					weightedLiquidationThresholdBps: 0
				})
			).toBe(0);
		});
	});

	describe('liquidiumProjectedHealthAfterWithdrawPercent', () => {
		it('stays at 100 when there is no debt', () => {
			expect(
				liquidiumProjectedHealthAfterWithdrawPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 0,
					withdrawUsd: 50_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(100);
		});

		it('reproduces the current health for a zero withdraw', () => {
			// ltv 20k/100k = 0.2; health = (1 − 0.2/0.8)×100 = 75.
			expect(
				liquidiumProjectedHealthAfterWithdrawPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 20_000,
					withdrawUsd: 0,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBeCloseTo(75, 5);
		});

		it('lowers health as collateral is removed', () => {
			// remaining 50k; ltv 20k/50k = 0.4; health = (1 − 0.4/0.8)×100 = 50.
			expect(
				liquidiumProjectedHealthAfterWithdrawPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 20_000,
					withdrawUsd: 50_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBeCloseTo(50, 5);
		});

		it('is 0 when the withdraw removes all (or more than all) collateral', () => {
			expect(
				liquidiumProjectedHealthAfterWithdrawPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 20_000,
					withdrawUsd: 100_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(0);
		});
	});

	describe('mapLiquidiumReserve', () => {
		it('maps a reserve to oisy units (USD numbers, base-unit amounts kept)', () => {
			const reserve: UserReserve = {
				position: buildPosition({ borrowed: 5n, borrowedDecimals: 6n }),
				pool: buildPool(),
				priceUsd: 60_000,
				suppliedUsd: 6_000_000n,
				borrowedUsd: 30_000n,
				usdDecimals: 2n
			};

			expect(mapLiquidiumReserve(reserve)).toEqual({
				poolId: 'pool-btc',
				asset: 'BTC',
				chain: 'BTC',
				supplyApy: expect.closeTo(5),
				borrowApy: expect.closeTo(9),
				deposited: 100_000_000n,
				depositedDecimals: 8,
				borrowed: 5n,
				borrowedDecimals: 6,
				suppliedUsd: 60_000,
				borrowedUsd: 300
			});
		});
	});

	describe('liquidiumNetApy', () => {
		const buildReserve = (overrides: Partial<LiquidiumReserve>): LiquidiumReserve => ({
			poolId: 'p',
			asset: 'BTC',
			chain: 'BTC',
			supplyApy: 0,
			borrowApy: 0,
			deposited: ZERO,
			depositedDecimals: 8,
			borrowed: ZERO,
			borrowedDecimals: 8,
			suppliedUsd: 0,
			borrowedUsd: 0,
			...overrides
		});

		it('equals the supply APY when there is no debt', () => {
			expect(
				liquidiumNetApy({
					reserves: [buildReserve({ suppliedUsd: 1000, supplyApy: 5 })],
					totalSuppliedUsd: 1000,
					totalBorrowedUsd: 0,
					netValueUsd: 1000,
					availableBorrowsUsd: 0,
					weightedLiquidationThresholdBps: 8000,
					healthFactorPercent: 100
				})
			).toBeCloseTo(5);
		});

		it('is the spread between weighted supply APY and weighted borrow APY', () => {
			expect(
				liquidiumNetApy({
					reserves: [
						buildReserve({ suppliedUsd: 1000, supplyApy: 5 }),
						buildReserve({ borrowedUsd: 800, borrowApy: 8 })
					],
					totalSuppliedUsd: 1000,
					totalBorrowedUsd: 800,
					netValueUsd: 200,
					availableBorrowsUsd: 0,
					weightedLiquidationThresholdBps: 8000,
					healthFactorPercent: 40
				})
				// net supply APY (5%) − net borrow APY (8%) = −3%, independent of net value.
			).toBeCloseTo(5 - 8);
		});

		it('value-weights each side across reserves', () => {
			expect(
				liquidiumNetApy({
					reserves: [
						buildReserve({ suppliedUsd: 1080, supplyApy: 0 }),
						buildReserve({ suppliedUsd: 960, supplyApy: 0.44 }),
						buildReserve({ borrowedUsd: 1000, borrowApy: 2.26 })
					],
					totalSuppliedUsd: 2040,
					totalBorrowedUsd: 1000,
					netValueUsd: 1040,
					availableBorrowsUsd: 0,
					weightedLiquidationThresholdBps: 7400,
					healthFactorPercent: 33.6
				})
				// (1080·0 + 960·0.44)/2040 − (1000·2.26)/1000 = 0.207% − 2.26% ≈ −2.05%.
			).toBeCloseTo(-2.05, 2);
		});

		it('is null when there are no positions', () => {
			expect(
				liquidiumNetApy({
					reserves: [],
					totalSuppliedUsd: 0,
					totalBorrowedUsd: 0,
					netValueUsd: 0,
					availableBorrowsUsd: 0,
					weightedLiquidationThresholdBps: 8000,
					healthFactorPercent: 100
				})
			).toBeNull();
		});
	});

	describe('liquidiumNetInterestUsd', () => {
		const buildReserve = (overrides: Partial<LiquidiumReserve>): LiquidiumReserve => ({
			poolId: 'p',
			asset: 'BTC',
			chain: 'BTC',
			supplyApy: 0,
			borrowApy: 0,
			deposited: ZERO,
			depositedDecimals: 8,
			borrowed: ZERO,
			borrowedDecimals: 8,
			suppliedUsd: 0,
			borrowedUsd: 0,
			...overrides
		});

		const buildPortfolio = (reserves: LiquidiumReserve[]): LiquidiumPortfolio => ({
			reserves,
			totalSuppliedUsd: 0,
			totalBorrowedUsd: 0,
			netValueUsd: 0,
			availableBorrowsUsd: 0,
			weightedLiquidationThresholdBps: 8000,
			healthFactorPercent: 100
		});

		it('is 0 when there is no portfolio', () => {
			expect(liquidiumNetInterestUsd(null)).toBe(0);
		});

		it('is 0 when there are no reserves', () => {
			expect(liquidiumNetInterestUsd(buildPortfolio([]))).toBe(0);
		});

		it('sums supply yield net of borrow cost across reserves', () => {
			expect(
				liquidiumNetInterestUsd(
					buildPortfolio([
						buildReserve({ suppliedUsd: 1000, supplyApy: 5 }),
						buildReserve({ suppliedUsd: 2000, supplyApy: 3, borrowedUsd: 500, borrowApy: 8 })
					])
				)
			).toBeCloseTo((1000 * 5 + 2000 * 3 - 500 * 8) / 100);
		});
	});

	describe('mapLiquidiumPortfolio', () => {
		it('maps summary aggregates and reserves', () => {
			const summary: UserPositionSummary = {
				totalCollateralUsd: 10_000n,
				totalDebtUsd: 4_000n,
				availableBorrowsUsd: 2_000n,
				netWorthUsd: 6_000n,
				usdDecimals: 2n,
				currentLtvBps: 4_000n,
				weightedMaxLtvBps: 6_000n,
				weightedLiquidationThresholdBps: 8_000n,
				healthFactor: scaledHealth(60n)
			};

			const portfolio = mapLiquidiumPortfolio({
				reserves: [
					{
						position: buildPosition(),
						pool: buildPool(),
						priceUsd: 60_000,
						suppliedUsd: 6_000_000n,
						borrowedUsd: ZERO,
						usdDecimals: 2n
					}
				],
				summary
			});

			expect(portfolio.totalSuppliedUsd).toBe(100);
			expect(portfolio.totalBorrowedUsd).toBe(40);
			expect(portfolio.netValueUsd).toBe(60);
			expect(portfolio.availableBorrowsUsd).toBe(20);
			// Health is derived from the bps fields: (1 − 4000/8000) × 100 = 50%.
			expect(portfolio.healthFactorPercent).toBeCloseTo(50);
			expect(portfolio.reserves).toHaveLength(1);
		});
	});
});
