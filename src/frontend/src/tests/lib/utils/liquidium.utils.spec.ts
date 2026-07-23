import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumMarket, LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import {
	liquidiumBorrowingPowerPotentialUsd,
	liquidiumBorrowInterestUsd,
	liquidiumFreeCollateralUsd,
	liquidiumHealthFactorPercent,
	liquidiumHealthLevel,
	liquidiumMarketToken,
	liquidiumMaxLtv,
	liquidiumMaxSupplyApy,
	liquidiumMinBorrowApy,
	liquidiumNetInterestUsd,
	liquidiumProjectedHealthAfterRepayPercent,
	liquidiumProjectedHealthAfterWithdrawPercent,
	liquidiumProjectedHealthPercent,
	liquidiumResultingLtvPercent,
	liquidiumSupplyInterestUsd,
	liquidiumSupportedRails,
	mapLiquidiumMarket,
	mapLiquidiumMarketRails,
	mapLiquidiumPortfolio,
	mapLiquidiumReserve,
	orderLiquidiumMarkets
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
	sameAssetBorrowingDustThreshold: ZERO,
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
				maxLtv: expect.closeTo(0),
				frozen: false,
				available: true
			});
		});

		it('maps maxLtv from basis points to a 0–1 ratio', () => {
			// maxLtv is basis points: 7000 / 10_000 = 0.7.
			expect(mapLiquidiumMarket(buildPool({ maxLtv: 7000n })).maxLtv).toBeCloseTo(0.7);
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

	describe('liquidiumSupportedRails', () => {
		it('offers the native + ICP (ck) rails for BTC', () => {
			expect(liquidiumSupportedRails('BTC')).toEqual(['BTC', 'ICP']);
		});

		it('offers the ERC-20 + ICP (ck) rails for the stablecoins', () => {
			expect(liquidiumSupportedRails('USDC')).toEqual(['ETH', 'ICP']);
			expect(liquidiumSupportedRails('USDT')).toEqual(['ETH', 'ICP']);
		});

		it('offers only the ICP rail for ICP', () => {
			expect(liquidiumSupportedRails('ICP')).toEqual(['ICP']);
		});
	});

	describe('mapLiquidiumMarketRails', () => {
		it('expands a pool into one market per transfer rail, sharing pool economics + poolId', () => {
			const markets = mapLiquidiumMarketRails(buildPool());

			expect(markets.map(({ chain }) => chain)).toEqual(['BTC', 'ICP']);
			expect(
				markets.every(({ poolId, asset }) => poolId === 'pool-btc' && asset === 'BTC')
			).toBeTruthy();
			// Same pool → identical rates/availability across rails; only the transfer chain differs.
			expect(markets[0].supplyApy).toBe(markets[1].supplyApy);
			expect(markets[0].available).toBe(markets[1].available);
		});

		it('leaves a single-rail asset (ICP) as one market', () => {
			const markets = mapLiquidiumMarketRails(
				buildPool({ id: 'pool-icp', asset: 'ICP', chain: 'ICP' })
			);

			expect(markets).toHaveLength(1);
			expect(markets[0].chain).toBe('ICP');
		});
	});

	describe('orderLiquidiumMarkets', () => {
		const buildMarket = (overrides: Partial<LiquidiumMarket> = {}): LiquidiumMarket => ({
			poolId: 'pool-btc',
			asset: 'BTC',
			chain: 'BTC',
			supplyApy: 5,
			borrowApy: 9,
			frozen: false,
			available: true,
			...overrides
		});

		// Display token per market, keyed `${asset}-${chain}` (ckBTC = BTC-ICP, native ICP = ICP-ICP).
		const nativeBtc = buildMarket();
		const ckBtc = buildMarket({ chain: 'ICP' });
		const eth = buildMarket({ poolId: 'pool-eth', asset: 'ETH', chain: 'ETH' });
		const usdc = buildMarket({ poolId: 'pool-usdc', asset: 'USDC', chain: 'ETH' });
		const ckUsdc = buildMarket({ poolId: 'pool-usdc', asset: 'USDC', chain: 'ICP' });
		const usdt = buildMarket({ poolId: 'pool-usdt', asset: 'USDT', chain: 'ETH' });
		const ckUsdt = buildMarket({ poolId: 'pool-usdt', asset: 'USDT', chain: 'ICP' });
		const icp = buildMarket({ poolId: 'pool-icp', asset: 'ICP', chain: 'ICP' });

		const keys = (markets: LiquidiumMarket[]): string[] =>
			markets.map(({ asset, chain }) => `${asset}-${chain}`);

		it('sorts by pool then native rail first, placing ICP after the ETH pool', () => {
			// Received in a scrambled pool order to prove the sort re-orders it.
			const markets = [usdc, ckUsdc, ckBtc, nativeBtc, usdt, ckUsdt, icp, eth];

			expect(keys(orderLiquidiumMarkets(markets))).toEqual([
				'BTC-BTC',
				'BTC-ICP',
				'ETH-ETH',
				'ICP-ICP',
				'USDC-ETH',
				'USDC-ICP',
				'USDT-ETH',
				'USDT-ICP'
			]);
		});

		it('puts the native rail before its ck rail within a pool', () => {
			expect(keys(orderLiquidiumMarkets([ckBtc, nativeBtc]))).toEqual(['BTC-BTC', 'BTC-ICP']);
			expect(keys(orderLiquidiumMarkets([ckUsdc, usdc]))).toEqual(['USDC-ETH', 'USDC-ICP']);
		});

		it('breaks ties between same-pool native rails by network order', () => {
			// Two native rails (neither is the ICP ck rail) → decided by LIQUIDIUM_NETWORK_ORDER.
			const btcOnEth = buildMarket({ chain: 'ETH' });

			expect(keys(orderLiquidiumMarkets([btcOnEth, nativeBtc]))).toEqual(['BTC-BTC', 'BTC-ETH']);
		});

		it('keeps assets outside the pool order last, in their received order and grouped', () => {
			const fooEth = buildMarket({ poolId: 'pool-foo', asset: 'FOO', chain: 'ETH' });
			const fooIcp = buildMarket({ poolId: 'pool-foo', asset: 'FOO', chain: 'ICP' });
			const barEth = buildMarket({ poolId: 'pool-bar', asset: 'BAR', chain: 'ETH' });

			expect(keys(orderLiquidiumMarkets([barEth, fooEth, nativeBtc, fooIcp, icp]))).toEqual([
				'BTC-BTC',
				'ICP-ICP',
				'BAR-ETH',
				'FOO-ETH',
				'FOO-ICP'
			]);
		});

		it('does not mutate the input array', () => {
			const markets = [icp, nativeBtc];
			orderLiquidiumMarkets(markets);

			expect(keys(markets)).toEqual(['ICP-ICP', 'BTC-BTC']);
		});

		it('handles an empty list', () => {
			expect(orderLiquidiumMarkets([])).toEqual([]);
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

	describe('liquidiumMinBorrowApy', () => {
		it('returns the lowest borrow APY across available pools, ignoring unavailable ones', () => {
			const markets = [
				mapLiquidiumMarket(buildPool({ id: 'a', borrowingRate: 9n })),
				mapLiquidiumMarket(buildPool({ id: 'b', borrowingRate: 4n })),
				mapLiquidiumMarket(buildPool({ id: 'c', borrowingRate: 1n, frozen: true }))
			];

			expect(liquidiumMinBorrowApy(markets)).toBeCloseTo(4);
		});

		it('returns 0 when there are no markets', () => {
			expect(liquidiumMinBorrowApy([])).toBe(0);
		});
	});

	describe('liquidiumMaxLtv', () => {
		it('returns the highest maxLtv across available pools, ignoring unavailable ones', () => {
			const markets = [
				mapLiquidiumMarket(buildPool({ id: 'a', maxLtv: 5000n })),
				mapLiquidiumMarket(buildPool({ id: 'b', maxLtv: 7000n })),
				mapLiquidiumMarket(buildPool({ id: 'c', maxLtv: 9000n, frozen: true }))
			];

			expect(liquidiumMaxLtv(markets)).toBeCloseTo(0.7);
		});

		it('returns 0 when there are no markets', () => {
			expect(liquidiumMaxLtv([])).toBe(0);
		});
	});

	describe('liquidiumBorrowingPowerPotentialUsd', () => {
		it('adds idle-wallet potential to the already-available borrowing power', () => {
			expect(
				liquidiumBorrowingPowerPotentialUsd({
					availableBorrowsUsd: 1500,
					walletBalanceUsd: 10_000,
					maxLtv: 0.7
				})
			).toBeCloseTo(1500 + 10_000 * 0.7);
		});

		it('is just the wallet potential when there is no supplied collateral', () => {
			expect(
				liquidiumBorrowingPowerPotentialUsd({
					availableBorrowsUsd: 0,
					walletBalanceUsd: 2000,
					maxLtv: 0.5
				})
			).toBeCloseTo(1000);
		});

		it('floors a negative wallet balance at 0', () => {
			expect(
				liquidiumBorrowingPowerPotentialUsd({
					availableBorrowsUsd: 300,
					walletBalanceUsd: -50,
					maxLtv: 0.7
				})
			).toBe(300);
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

	describe('liquidiumProjectedHealthAfterRepayPercent', () => {
		it('reproduces the current health for a zero repay', () => {
			// ltv 40k/100k = 0.4; health = (1 − 0.4/0.8)×100 = 50.
			expect(
				liquidiumProjectedHealthAfterRepayPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 40_000,
					repayUsd: 0,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBeCloseTo(50, 5);
		});

		it('improves health as debt is repaid', () => {
			// remaining 20k; ltv 20k/100k = 0.2; health = (1 − 0.2/0.8)×100 = 75.
			expect(
				liquidiumProjectedHealthAfterRepayPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 40_000,
					repayUsd: 20_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBeCloseTo(75, 5);
		});

		it('returns 100 when the debt is fully cleared', () => {
			expect(
				liquidiumProjectedHealthAfterRepayPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 40_000,
					repayUsd: 40_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(100);
		});

		it('returns 100 when repaying more than the outstanding debt', () => {
			expect(
				liquidiumProjectedHealthAfterRepayPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 40_000,
					repayUsd: 50_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(100);
		});

		it('is 0 when debt remains but there is no collateral or threshold', () => {
			expect(
				liquidiumProjectedHealthAfterRepayPercent({
					totalCollateralUsd: 0,
					totalDebtUsd: 40_000,
					repayUsd: 10_000,
					weightedLiquidationThresholdBps: 8_000
				})
			).toBe(0);
		});

		it('is 0 when debt remains but the liquidation threshold is zero', () => {
			expect(
				liquidiumProjectedHealthAfterRepayPercent({
					totalCollateralUsd: 100_000,
					totalDebtUsd: 40_000,
					repayUsd: 10_000,
					weightedLiquidationThresholdBps: 0
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
				debtInterest: ZERO,
				suppliedUsd: 60_000,
				borrowedUsd: 300
			});
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

	describe('liquidiumBorrowInterestUsd', () => {
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
			expect(liquidiumBorrowInterestUsd(null)).toBe(0);
		});

		it('is 0 when there are no reserves', () => {
			expect(liquidiumBorrowInterestUsd(buildPortfolio([]))).toBe(0);
		});

		it('sums borrow cost across reserves, ignoring supplies', () => {
			expect(
				liquidiumBorrowInterestUsd(
					buildPortfolio([
						buildReserve({ suppliedUsd: 1000, supplyApy: 5 }),
						buildReserve({ borrowedUsd: 2000, borrowApy: 8 }),
						buildReserve({ borrowedUsd: 500, borrowApy: 10 })
					])
				)
			).toBeCloseTo((2000 * 8 + 500 * 10) / 100);
		});
	});

	describe('liquidiumSupplyInterestUsd', () => {
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
			expect(liquidiumSupplyInterestUsd(null)).toBe(0);
		});

		it('is 0 when there are no reserves', () => {
			expect(liquidiumSupplyInterestUsd(buildPortfolio([]))).toBe(0);
		});

		it('sums supply earnings across reserves, ignoring borrows', () => {
			expect(
				liquidiumSupplyInterestUsd(
					buildPortfolio([
						buildReserve({ suppliedUsd: 1000, supplyApy: 5 }),
						buildReserve({ suppliedUsd: 2000, supplyApy: 3 }),
						buildReserve({ borrowedUsd: 500, borrowApy: 10 })
					])
				)
			).toBeCloseTo((1000 * 5 + 2000 * 3) / 100);
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

	describe('liquidiumMarketToken', () => {
		it('resolves native BTC on the BTC chain', () => {
			expect(liquidiumMarketToken({ chain: 'BTC', asset: 'BTC', tokens: [] })).toBe(
				BTC_MAINNET_TOKEN
			);
		});

		it('resolves ERC-20 stablecoins on the ETH chain', () => {
			expect(liquidiumMarketToken({ chain: 'ETH', asset: 'USDC', tokens: [] })).toBe(USDC_TOKEN);
			expect(liquidiumMarketToken({ chain: 'ETH', asset: 'USDT', tokens: [] })).toBe(USDT_TOKEN);
		});

		it('resolves native ICP on the ICP chain', () => {
			expect(liquidiumMarketToken({ chain: 'ICP', asset: 'ICP', tokens: [] })).toBe(ICP_TOKEN);
		});

		it('does not collapse a ck asset onto its native/ERC token — needs the twin from the list', () => {
			// The same symbol on the ICP chain is a ck twin, never the native BTC / ERC-20 token; with
			// no twin in the list it resolves to nothing rather than the wrong (native/ERC) token.
			expect(liquidiumMarketToken({ chain: 'ICP', asset: 'BTC', tokens: [] })).toBeUndefined();
			expect(liquidiumMarketToken({ chain: 'ICP', asset: 'USDC', tokens: [] })).toBeUndefined();
		});

		it('returns undefined for an unsupported (chain, asset) pair', () => {
			expect(liquidiumMarketToken({ chain: 'BTC', asset: 'USDC', tokens: [] })).toBeUndefined();
			expect(liquidiumMarketToken({ chain: 'SOL', asset: 'SOL', tokens: [] })).toBeUndefined();
		});
	});
});
