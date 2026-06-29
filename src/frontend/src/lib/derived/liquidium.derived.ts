import { goto } from '$app/navigation';
import { EarningCardFields } from '$env/types/env.earning-cards';
import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { EarningProviderData } from '$lib/types/earning-provider';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import type { Token } from '$lib/types/token';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import {
	liquidiumMaxSupplyApy as computeMaxSupplyApy,
	liquidiumNetInterestUsd
} from '$lib/utils/liquidium.utils';
import { nonNullish } from '@dfinity/utils';
import type { AssetPrices } from '@liquidium/client';
import { derived, type Readable } from 'svelte/store';

export const liquidiumMarkets: Readable<LiquidiumMarket[]> = derived(
	liquidiumStore,
	({ markets }) => markets
);

export const liquidiumPortfolio: Readable<LiquidiumPortfolio | null> = derived(
	liquidiumStore,
	({ portfolio }) => portfolio
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
	...Object.values(LIQUIDIUM_ASSET_TOKENS).reduce<Set<string>>((acc, token) => {
		const icon = pick(token);
		return nonNullish(icon) ? acc.add(icon) : acc;
	}, new Set())
];

const liquidiumNetworkIcons = liquidiumCardIcons((token) => token.network.icon);
const liquidiumAssetIcons = liquidiumCardIcons((token) => token.icon);

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
