import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import {
	liquidiumHealthFactorToPercent,
	liquidiumHealthLevel,
	liquidiumMaxSupplyApy,
	liquidiumNetApy,
	liquidiumNetInterestUsd,
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

	describe('liquidiumHealthFactorToPercent', () => {
		it('maps a scaled health factor to a percentage', () => {
			expect(liquidiumHealthFactorToPercent(scaledHealth(60n))).toBeCloseTo(60);
		});

		it('clamps to 100 (no-debt / over-collateralised)', () => {
			expect(liquidiumHealthFactorToPercent(scaledHealth(500n))).toBe(100);
		});

		it('is 0 at liquidation', () => {
			expect(liquidiumHealthFactorToPercent(ZERO)).toBe(0);
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
					healthFactorPercent: 100
				})
			).toBeCloseTo(5);
		});

		it('is negative when borrow cost outweighs supply yield', () => {
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
					healthFactorPercent: 40
				})
			).toBeCloseTo((1000 * 5 - 800 * 8) / 200);
		});

		it('is null when there is no net value', () => {
			expect(
				liquidiumNetApy({
					reserves: [],
					totalSuppliedUsd: 0,
					totalBorrowedUsd: 0,
					netValueUsd: 0,
					availableBorrowsUsd: 0,
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
			expect(portfolio.healthFactorPercent).toBeCloseTo(60);
			expect(portfolio.reserves).toHaveLength(1);
		});
	});
});
