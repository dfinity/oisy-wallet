import { goto } from '$app/navigation';
import { EarningCardFields } from '$env/types/env.earning-cards';
import { ZERO } from '$lib/constants/app.constants';
import { LIQUIDIUM_ADVERTISED_TOKENS } from '$lib/constants/liquidium.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { EarningProviderData } from '$lib/types/earning-provider';
import type { LiquidiumMarket, LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import type { Token } from '$lib/types/token';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import {
	liquidiumBorrowInterestUsd as computeBorrowInterestUsd,
	liquidiumMaxLtv as computeMaxLtv,
	liquidiumMaxSupplyApy as computeMaxSupplyApy,
	liquidiumMinBorrowApy as computeMinBorrowApy,
	liquidiumBorrowingPowerPotentialUsd,
	liquidiumNetInterestUsd,
	liquidiumReserveRails,
	orderLiquidiumRails
} from '$lib/utils/liquidium.utils';
import { nonNullish } from '@dfinity/utils';
import type { AssetPrices } from '@liquidium/client';
import { derived, type Readable } from 'svelte/store';

export const liquidiumMarkets: Readable<LiquidiumMarket[]> = derived(
	liquidiumStore,
	({ markets }) => orderLiquidiumRails(markets)
);

export const liquidiumPortfolio: Readable<LiquidiumPortfolio | null> = derived(
	liquidiumStore,
	({ portfolio }) => portfolio
);

export const liquidiumSupplyMarkets: Readable<LiquidiumMarket[]> = derived(
	[liquidiumMarkets, liquidiumPortfolio],
	([markets, portfolio]) =>
		markets.filter(
			({ available, poolId }) =>
				available &&
				!(portfolio?.reserves ?? []).some(
					(reserve) => reserve.poolId === poolId && reserve.borrowed > ZERO
				)
		)
);

export const liquidiumBorrowMarkets: Readable<LiquidiumMarket[]> = derived(
	[liquidiumMarkets, liquidiumPortfolio],
	([markets, portfolio]) =>
		markets.filter(
			({ available, poolId }) =>
				available &&
				!(portfolio?.reserves ?? []).some(
					(reserve) => reserve.poolId === poolId && reserve.deposited > ZERO
				)
		)
);

// Positions the user can withdraw from: reserves with a supplied balance, expanded per
// transfer rail so a BTC/USDC/USDT position offers both native and ck (ICP) delivery, ordered
// like the Markets list (pool, then native rail first).
export const liquidiumWithdrawReserves: Readable<LiquidiumReserve[]> = derived(
	liquidiumPortfolio,
	(portfolio) =>
		orderLiquidiumRails(
			(portfolio?.reserves ?? [])
				.filter(({ deposited }) => deposited > ZERO)
				.flatMap(liquidiumReserveRails)
		)
);

// Positions the user can repay: reserves with outstanding debt, expanded per transfer rail
// so a BTC/USDC/USDT debt can be repaid with either the native asset or its ck twin, ordered
// like the Markets list (pool, then native rail first).
export const liquidiumRepayReserves: Readable<LiquidiumReserve[]> = derived(
	liquidiumPortfolio,
	(portfolio) =>
		orderLiquidiumRails(
			(portfolio?.reserves ?? [])
				.filter(({ borrowed }) => borrowed > ZERO)
				.flatMap(liquidiumReserveRails)
		)
);

// SDK USD prices for the borrow form's USD / fiat math.
export const liquidiumAssetPrices: Readable<AssetPrices> = derived(
	liquidiumStore,
	({ assetPrices }) => assetPrices
);

// Best supply APY across enterable pools (Earn card badge).
export const liquidiumMaxSupplyApy: Readable<number> = derived(
	liquidiumMarkets,
	computeMaxSupplyApy
);

// Lowest borrow APY across enterable pools (Borrow card "from" badge).
export const liquidiumMinBorrowApy: Readable<number> = derived(
	liquidiumMarkets,
	computeMinBorrowApy
);

// Aggregate debt USD; 0 when no positions.
export const liquidiumTotalBorrowedUsd: Readable<number> = derived(
	liquidiumPortfolio,
	(portfolio) => portfolio?.totalBorrowedUsd ?? 0
);

// Best (highest) max-LTV ratio across enterable pools.
export const liquidiumMaxLtv: Readable<number> = derived(liquidiumMarkets, computeMaxLtv);

// Estimated borrowing power USD: remaining power from supplied collateral plus what idle
// wallet assets could unlock if supplied (mirrors the Earn page's earning potential).
export const liquidiumBorrowingPowerUsd: Readable<number> = derived(
	[liquidiumPortfolio, liquidiumMaxLtv, enabledMainnetFungibleTokensUsdBalance],
	([portfolio, maxLtv, walletBalanceUsd]) =>
		liquidiumBorrowingPowerPotentialUsd({
			availableBorrowsUsd: portfolio?.availableBorrowsUsd ?? 0,
			walletBalanceUsd: walletBalanceUsd ?? 0,
			maxLtv
		})
);

// Yearly borrow interest USD; 0 when no positions.
export const liquidiumBorrowInterestUsd: Readable<number> = derived(
	liquidiumPortfolio,
	computeBorrowInterestUsd
);

// Net value (Σ supplied − Σ borrowed); 0 when no positions.
export const liquidiumNetValueUsd: Readable<number> = derived(
	liquidiumPortfolio,
	(portfolio) => portfolio?.netValueUsd ?? 0
);

// Portfolio health %, null when no positions.
export const liquidiumHealthFactorPercent: Readable<number | null> = derived(
	liquidiumPortfolio,
	(portfolio) => (nonNullish(portfolio) ? portfolio.healthFactorPercent : null)
);

// Deduped icons for the advertised v1 asset set (Earn card Networks/Assets rows).
const liquidiumCardIcons = (pick: (token: Token) => string | undefined): string[] => [
	...LIQUIDIUM_ADVERTISED_TOKENS.reduce<Set<string>>((acc, token) => {
		const icon = pick(token);
		return nonNullish(icon) ? acc.add(icon) : acc;
	}, new Set())
];

export const liquidiumNetworkIcons = liquidiumCardIcons((token) => token.network.icon);
export const liquidiumAssetIcons = liquidiumCardIcons((token) => token.icon);

// Earn-page provider card data (mirrors the Harvest card); action → provider page.
export const liquidiumEarningData: Readable<EarningProviderData> = derived(
	[liquidiumMaxSupplyApy, liquidiumPortfolio, enabledMainnetFungibleTokensUsdBalance],
	([
		$liquidiumMaxSupplyApy,
		$liquidiumPortfolio,
		$enabledMainnetFungibleTokensUsdBalance
	]): EarningProviderData => ({
		[EarningCardFields.APY]: formatStakeApyNumber($liquidiumMaxSupplyApy),
		[EarningCardFields.NETWORKS]: liquidiumNetworkIcons,
		[EarningCardFields.ASSETS]: liquidiumAssetIcons,
		[EarningCardFields.CURRENT_EARNING]: liquidiumNetInterestUsd($liquidiumPortfolio),
		[EarningCardFields.EARNING_POTENTIAL]: nonNullish($enabledMainnetFungibleTokensUsdBalance)
			? (Math.max(
					0,
					$enabledMainnetFungibleTokensUsdBalance - ($liquidiumPortfolio?.totalSuppliedUsd ?? 0)
				) *
					$liquidiumMaxSupplyApy) /
				100
			: undefined,
		action: () => goto(AppPath.ProvidersLiquidium)
	})
);

// Borrow-page provider card data (mirrors the Earn card, borrow-framed); action → provider page.
export const liquidiumBorrowData: Readable<EarningProviderData> = derived(
	[liquidiumMinBorrowApy, liquidiumTotalBorrowedUsd, liquidiumBorrowInterestUsd],
	([
		$liquidiumMinBorrowApy,
		$liquidiumTotalBorrowedUsd,
		$liquidiumBorrowInterestUsd
	]): EarningProviderData => ({
		[EarningCardFields.APY]: formatStakeApyNumber($liquidiumMinBorrowApy),
		[EarningCardFields.NETWORKS]: liquidiumNetworkIcons,
		[EarningCardFields.ASSETS]: liquidiumAssetIcons,
		[EarningCardFields.CURRENT_BORROWING]: $liquidiumTotalBorrowedUsd,
		[EarningCardFields.INTEREST_PER_YEAR]: $liquidiumBorrowInterestUsd,
		action: () => goto(AppPath.ProvidersLiquidium)
	})
);
