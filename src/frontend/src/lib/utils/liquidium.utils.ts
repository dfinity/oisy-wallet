import type { TokenId } from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
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
		// No threshold to compute against: healthy only when there's also no debt. Debt with a
		// missing/zero threshold is a bad/edge payload — surface it as fully at-risk rather than
		// masking it as a healthy 100%.
		return currentLtvBps > ZERO ? 0 : 100;
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

// Free collateral USD: max(0, collateral − debt / threshold); full collateral when no debt.
// Open debt with a zero threshold (edge payload) → fully reserved.
export const liquidiumFreeCollateralUsd = ({
	totalCollateralUsd,
	totalDebtUsd,
	weightedLiquidationThresholdBps
}: {
	totalCollateralUsd: number;
	totalDebtUsd: number;
	weightedLiquidationThresholdBps: number;
}): number => {
	if (totalDebtUsd <= 0) {
		return Math.max(0, totalCollateralUsd);
	}

	const thresholdRatio = weightedLiquidationThresholdBps / 10_000;

	if (thresholdRatio <= 0) {
		return 0;
	}

	return Math.max(0, totalCollateralUsd - totalDebtUsd / thresholdRatio);
};

// Projected health after removing `withdrawUsd` of collateral: (1 − ltv / threshold) × 100,
// clamped. Threshold held constant (v1 approximation; canister is the final gate).
export const liquidiumProjectedHealthAfterWithdrawPercent = ({
	totalCollateralUsd,
	totalDebtUsd,
	withdrawUsd,
	weightedLiquidationThresholdBps
}: {
	totalCollateralUsd: number;
	totalDebtUsd: number;
	withdrawUsd: number;
	weightedLiquidationThresholdBps: number;
}): number => {
	if (totalDebtUsd <= 0) {
		return 100;
	}

	const remainingCollateralUsd = totalCollateralUsd - withdrawUsd;
	const thresholdRatio = weightedLiquidationThresholdBps / 10_000;

	if (remainingCollateralUsd <= 0 || thresholdRatio <= 0) {
		return 0;
	}

	const resultingLtv = totalDebtUsd / remainingCollateralUsd;

	return Math.min(100, Math.max(0, (1 - resultingLtv / thresholdRatio) * 100));
};

// Projected health after repaying `repayUsd` of debt: (1 − ltv / threshold) × 100,
// clamped. Repaying only reduces debt, so health moves toward 100% (fully cleared → 100%).
// Threshold held constant (v1 approximation, conservative for repay; canister is the final gate).
export const liquidiumProjectedHealthAfterRepayPercent = ({
	totalCollateralUsd,
	totalDebtUsd,
	repayUsd,
	weightedLiquidationThresholdBps
}: {
	totalCollateralUsd: number;
	totalDebtUsd: number;
	repayUsd: number;
	weightedLiquidationThresholdBps: number;
}): number => {
	const remainingDebtUsd = Math.max(0, totalDebtUsd - repayUsd);

	if (remainingDebtUsd <= 0) {
		return 100;
	}

	const thresholdRatio = weightedLiquidationThresholdBps / 10_000;

	if (totalCollateralUsd <= 0 || thresholdRatio <= 0) {
		return 0;
	}

	const resultingLtv = remainingDebtUsd / totalCollateralUsd;

	return Math.min(100, Math.max(0, (1 - resultingLtv / thresholdRatio) * 100));
};

const isUnderSupplyCap = ({ totalSupply, supplyCap }: Pool): boolean =>
	!nonNullish(supplyCap) || totalSupply < supplyCap;

export const mapLiquidiumMarket = (pool: Pool): LiquidiumMarket => ({
	poolId: pool.id,
	asset: pool.asset,
	chain: pool.chain,
	supplyApy: rateToPercent({ rate: pool.lendingRate, rateDecimals: pool.rateDecimals }),
	borrowApy: rateToPercent({ rate: pool.borrowingRate, rateDecimals: pool.rateDecimals }),
	// pool.maxLtv is basis points (the SDK uses it directly as `maxAllowedLtvBps`), not the
	// rate scale — convert to a 0–1 ratio.
	maxLtv: Number(pool.maxLtv) / 10_000,
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
	debtInterest: position.debtInterest,
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

// Best supply APY across enterable pools; 0 when none.
export const liquidiumMaxSupplyApy = (markets: LiquidiumMarket[]): number =>
	markets.reduce(
		(max, { supplyApy, available }) => (available ? Math.max(max, supplyApy) : max),
		0
	);

// Lowest borrow APY across enterable pools (Borrow card "from" badge); 0 when none.
export const liquidiumMinBorrowApy = (markets: LiquidiumMarket[]): number => {
	const rates = markets.filter(({ available }) => available).map(({ borrowApy }) => borrowApy);

	return rates.length > 0 ? Math.min(...rates) : 0;
};

// Best (highest) max-LTV ratio across enterable pools; 0 when none.
export const liquidiumMaxLtv = (markets: LiquidiumMarket[]): number =>
	markets.reduce((max, { maxLtv, available }) => (available ? Math.max(max, maxLtv ?? 0) : max), 0);

// Estimated total borrowing power in USD: the power still available from already-supplied
// collateral, plus what idle wallet assets could unlock if supplied. Deliberately an
// over-approximation (all fungibles, best max-LTV) mirroring the Earn page's earning
// potential — the protocol remains the real gate on any actual borrow.
export const liquidiumBorrowingPowerPotentialUsd = ({
	availableBorrowsUsd,
	walletBalanceUsd,
	maxLtv
}: {
	availableBorrowsUsd: number;
	walletBalanceUsd: number;
	maxLtv: number;
}): number => availableBorrowsUsd + Math.max(0, walletBalanceUsd) * maxLtv;

// Yearly borrow interest in USD (Σ borrowedUsd·borrowApy / 100); 0 when no positions.
export const liquidiumBorrowInterestUsd = (portfolio: LiquidiumPortfolio | null): number =>
	(portfolio?.reserves ?? []).reduce(
		(acc, { borrowedUsd, borrowApy }) => acc + (borrowedUsd * borrowApy) / 100,
		0
	);

// Yearly supply interest in USD (Σ suppliedUsd·supplyApy / 100); 0 when no positions.
export const liquidiumSupplyInterestUsd = (portfolio: LiquidiumPortfolio | null): number =>
	(portfolio?.reserves ?? []).reduce(
		(acc, { suppliedUsd, supplyApy }) => acc + (suppliedUsd * supplyApy) / 100,
		0
	);

// Net yearly interest in USD (Σ suppliedUsd·supplyApy − Σ borrowedUsd·borrowApy, /100); 0 when no positions.
export const liquidiumNetInterestUsd = (portfolio: LiquidiumPortfolio | null): number =>
	(portfolio?.reserves ?? []).reduce(
		(acc, { suppliedUsd, supplyApy, borrowedUsd, borrowApy }) =>
			acc + (suppliedUsd * supplyApy - borrowedUsd * borrowApy) / 100,
		0
	);
