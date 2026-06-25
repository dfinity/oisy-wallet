import {
	LIQUIDIUM_HEALTH_AT_RISK_PERCENT,
	LIQUIDIUM_HEALTH_CRITICAL_PERCENT,
	type LiquidiumHealthLevel
} from '$lib/constants/liquidium.constants';
import type { LiquidiumMarket, LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { nonNullish } from '@dfinity/utils';
import {
	RATE_SCALE,
	type Pool,
	type UserPositionSummary,
	type UserReserve
} from '@liquidium/client';

// Scaled protocol rate → percentage.
const rateToPercent = ({ rate, rateDecimals }: { rate: bigint; rateDecimals: bigint }): number =>
	(Number(rate) / 10 ** Number(rateDecimals)) * 100;

const scaledUsdToNumber = ({ value, decimals }: { value: bigint; decimals: bigint }): number =>
	Number(value) / 10 ** Number(decimals);

// SDK health factor (scaled by RATE_SCALE) → percentage, clamped [0, 100] (100% = no debt).
export const liquidiumHealthFactorToPercent = (healthFactor: bigint): number =>
	Math.min(100, Math.max(0, (Number(healthFactor) / Number(RATE_SCALE)) * 100));

export const liquidiumHealthLevel = (healthFactorPercent: number): LiquidiumHealthLevel =>
	healthFactorPercent >= LIQUIDIUM_HEALTH_AT_RISK_PERCENT
		? 'healthy'
		: healthFactorPercent >= LIQUIDIUM_HEALTH_CRITICAL_PERCENT
			? 'at-risk'
			: 'critical';

const isUnderSupplyCap = ({ totalSupply, supplyCap }: Pool): boolean =>
	!nonNullish(supplyCap) || totalSupply < supplyCap;

export const mapLiquidiumMarket = (pool: Pool): LiquidiumMarket => ({
	poolId: pool.id,
	asset: pool.asset,
	chain: pool.chain,
	supplyApy: rateToPercent({ rate: pool.lendingRate, rateDecimals: pool.rateDecimals }),
	borrowApy: rateToPercent({ rate: pool.borrowingRate, rateDecimals: pool.rateDecimals }),
	frozen: pool.frozen,
	available: !pool.frozen && isUnderSupplyCap(pool)
});

export const mapLiquidiumReserve = ({
	position,
	pool,
	suppliedUsd,
	borrowedUsd,
	usdDecimals
}: UserReserve): LiquidiumReserve => ({
	poolId: position.poolId,
	asset: position.asset,
	chain: pool.chain,
	supplyApy: rateToPercent({ rate: pool.lendingRate, rateDecimals: pool.rateDecimals }),
	borrowApy: rateToPercent({ rate: pool.borrowingRate, rateDecimals: pool.rateDecimals }),
	deposited: position.deposited,
	depositedDecimals: Number(position.depositedDecimals),
	borrowed: position.borrowed,
	borrowedDecimals: Number(position.borrowedDecimals),
	suppliedUsd: scaledUsdToNumber({ value: suppliedUsd, decimals: usdDecimals }),
	borrowedUsd: scaledUsdToNumber({ value: borrowedUsd, decimals: usdDecimals })
});

export const mapLiquidiumPortfolio = ({
	reserves,
	summary
}: {
	reserves: UserReserve[];
	summary: UserPositionSummary;
}): LiquidiumPortfolio => ({
	reserves: reserves.map(mapLiquidiumReserve),
	totalSuppliedUsd: scaledUsdToNumber({
		value: summary.totalCollateralUsd,
		decimals: summary.usdDecimals
	}),
	totalBorrowedUsd: scaledUsdToNumber({
		value: summary.totalDebtUsd,
		decimals: summary.usdDecimals
	}),
	netValueUsd: scaledUsdToNumber({ value: summary.netWorthUsd, decimals: summary.usdDecimals }),
	availableBorrowsUsd: scaledUsdToNumber({
		value: summary.availableBorrowsUsd,
		decimals: summary.usdDecimals
	}),
	healthFactorPercent: liquidiumHealthFactorToPercent(summary.healthFactor)
});

export const liquidiumNetApy = ({ reserves, netValueUsd }: LiquidiumPortfolio): number | null => {
	if (netValueUsd <= 0) {
		return null;
	}

	const weighted = reserves.reduce(
		(acc, { suppliedUsd, supplyApy, borrowedUsd, borrowApy }) =>
			acc + suppliedUsd * supplyApy - borrowedUsd * borrowApy,
		0
	);

	return weighted / netValueUsd;
};

// Best supply APY across enterable pools; 0 when none.
export const liquidiumMaxSupplyApy = (markets: LiquidiumMarket[]): number =>
	markets.reduce(
		(max, { supplyApy, available }) => (available ? Math.max(max, supplyApy) : max),
		0
	);

// Net yearly interest in USD (Σ suppliedUsd·supplyApy − Σ borrowedUsd·borrowApy, /100); 0 when no positions.
export const liquidiumNetInterestUsd = (portfolio: LiquidiumPortfolio | null): number =>
	(portfolio?.reserves ?? []).reduce(
		(acc, { suppliedUsd, supplyApy, borrowedUsd, borrowApy }) =>
			acc + (suppliedUsd * supplyApy - borrowedUsd * borrowApy) / 100,
		0
	);
