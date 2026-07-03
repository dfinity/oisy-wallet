// oisy-side Liquidium model: SDK scaled bigints mapped to display numbers at the
// service boundary; base-unit amounts stay bigint for the action wizards.

import type { AssetPrices } from '@liquidium/client';

// Protocol asset symbol (BTC, ETH, USDC, USDT).
export type LiquidiumAsset = string;

export interface LiquidiumMarket {
	poolId: string;
	asset: LiquidiumAsset;
	chain: string;
	supplyApy: number; // percent
	borrowApy: number; // percent
	// Maximum loan-to-value ratio (0–1) for this collateral; drives the borrowing-power
	// potential. Optional so existing market fixtures need not set it.
	maxLtv?: number;
	frozen: boolean;
	// Not frozen and under supply cap; else renders as "Coming soon".
	available: boolean;
}

export interface LiquidiumReserve {
	poolId: string;
	asset: LiquidiumAsset;
	chain: string;
	supplyApy: number; // percent
	borrowApy: number; // percent
	deposited: bigint; // base units
	depositedDecimals: number;
	borrowed: bigint; // base units (principal, excludes accrued interest)
	borrowedDecimals: number;
	// Accrued borrow interest, base units. Always populated by `mapLiquidiumReserve`;
	// optional only so existing reserve fixtures need not set it.
	debtInterest?: bigint;
	suppliedUsd: number;
	borrowedUsd: number;
}

export interface LiquidiumPortfolio {
	reserves: LiquidiumReserve[];
	totalSuppliedUsd: number; // = aggregate collateral USD
	totalBorrowedUsd: number; // = aggregate debt USD
	netValueUsd: number; // collateral − debt (may be negative)
	availableBorrowsUsd: number; // aggregate borrowing power left (maxBorrowable − debt)
	// Weighted liquidation threshold (bps) — for the projected health factor.
	weightedLiquidationThresholdBps: number;
	// 100% = no debt; near 0% = at risk.
	healthFactorPercent: number;
}

export interface LiquidiumStoreData {
	markets: LiquidiumMarket[];
	// null when the user has no profile / no positions yet.
	portfolio: LiquidiumPortfolio | null;
	// SDK USD prices for the borrow form's USD math. Empty until loaded.
	assetPrices: AssetPrices;
}
