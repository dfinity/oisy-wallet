import type { TokenId } from '$declarations/backend/backend.did';
import {
	LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS,
	LIQUIDIUM_HEALTH_AT_RISK_PERCENT,
	LIQUIDIUM_HEALTH_CRITICAL_PERCENT,
	type LiquidiumHealthLevel
} from '$lib/constants/liquidium.constants';
import type { LiquidiumMarket, LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import type { Pool, UserPositionSummary, UserReserve } from '@liquidium/client';

// Backend `TokenId` for a Liquidium AUT record — the ck-asset ledger backing the asset.
export const liquidiumAssetTokenId = (asset: string): TokenId => {
	const ledgerCanisterId = LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS[asset];

	assertNonNullish(ledgerCanisterId, `No ICRC ledger configured for Liquidium asset ${asset}`);

	return { Icrc: Principal.fromText(ledgerCanisterId) };
};

// Scaled protocol rate → percentage.
const rateToPercent = ({ rate, rateDecimals }: { rate: bigint; rateDecimals: bigint }): number =>
	(Number(rate) / 10 ** Number(rateDecimals)) * 100;

const scaledUsdToNumber = ({ value, decimals }: { value: bigint; decimals: bigint }): number =>
	Number(value) / 10 ** Number(decimals);

// Buffer-remaining health %: (1 − LTV / liquidationThreshold) × 100, clamped. From the
// bps fields, not the raw `healthFactor` (whose scale is unreliable across positions).
export const liquidiumHealthFactorPercent = ({
	currentLtvBps,
	weightedLiquidationThresholdBps
}: {
	currentLtvBps: bigint;
	weightedLiquidationThresholdBps: bigint;
}): number => {
	const threshold = Number(weightedLiquidationThresholdBps);

	if (threshold <= 0) {
		return 100;
	}

	return Math.min(100, Math.max(0, (1 - Number(currentLtvBps) / threshold) * 100));
};

export const liquidiumHealthLevel = (healthFactorPercent: number): LiquidiumHealthLevel =>
	healthFactorPercent >= LIQUIDIUM_HEALTH_AT_RISK_PERCENT
		? 'healthy'
		: healthFactorPercent >= LIQUIDIUM_HEALTH_CRITICAL_PERCENT
			? 'at-risk'
			: 'critical';

// Borrow preview math (aggregate — see the FE plan "Borrow milestone").
export const liquidiumResultingLtvPercent = ({
	totalDebtUsd,
	newBorrowUsd,
	totalCollateralUsd
}: {
	totalDebtUsd: number;
	newBorrowUsd: number;
	totalCollateralUsd: number;
}): number =>
	totalCollateralUsd > 0 ? ((totalDebtUsd + newBorrowUsd) / totalCollateralUsd) * 100 : 0;

// Projected health: current health minus the new debt's marginal effect
// (− newBorrowUsd / (collateral × liquidationThreshold)), clamped [0, 100].
export const liquidiumProjectedHealthPercent = ({
	currentHealthPercent,
	newBorrowUsd,
	totalCollateralUsd,
	weightedLiquidationThresholdBps
}: {
	currentHealthPercent: number;
	newBorrowUsd: number;
	totalCollateralUsd: number;
	weightedLiquidationThresholdBps: number;
}): number => {
	const thresholdRatio = weightedLiquidationThresholdBps / 10_000;

	if (totalCollateralUsd <= 0 || thresholdRatio <= 0) {
		return 0;
	}

	const marginalPercent = (newBorrowUsd / (totalCollateralUsd * thresholdRatio)) * 100;

	return Math.min(100, Math.max(0, currentHealthPercent - marginalPercent));
};

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
	weightedLiquidationThresholdBps: Number(summary.weightedLiquidationThresholdBps),
	healthFactorPercent: liquidiumHealthFactorPercent({
		currentLtvBps: summary.currentLtvBps,
		weightedLiquidationThresholdBps: summary.weightedLiquidationThresholdBps
	})
});

// Net APY = net supply APY − net borrow APY (value-weighted spread, matches Liquidium).
export const liquidiumNetApy = ({ reserves }: LiquidiumPortfolio): number | null => {
	const totalSupplied = reserves.reduce((acc, { suppliedUsd }) => acc + suppliedUsd, 0);
	const totalBorrowed = reserves.reduce((acc, { borrowedUsd }) => acc + borrowedUsd, 0);

	if (totalSupplied <= 0 && totalBorrowed <= 0) {
		return null;
	}

	const supplyInterest = reserves.reduce(
		(acc, { suppliedUsd, supplyApy }) => acc + suppliedUsd * supplyApy,
		0
	);
	const borrowInterest = reserves.reduce(
		(acc, { borrowedUsd, borrowApy }) => acc + borrowedUsd * borrowApy,
		0
	);

	const netSupplyApy = totalSupplied > 0 ? supplyInterest / totalSupplied : 0;
	const netBorrowApy = totalBorrowed > 0 ? borrowInterest / totalBorrowed : 0;

	return netSupplyApy - netBorrowApy;
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
