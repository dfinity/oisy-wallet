import { goto } from '$app/navigation';
import { EARNING_ENABLED } from '$env/earning';
import { EarningCardFields } from '$env/types/env.earning-cards';
import {
	enabledHarvestAutopilotsUsdBalance,
	harvestAutopilots
} from '$eth/derived/harvest-autopilots.derived';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { ZERO } from '$lib/constants/app.constants';
import { EARNING_TOP_RATE_MIN_APY } from '$lib/constants/earning.constants';
import { LIQUIDIUM_PROVIDER_ID } from '$lib/constants/liquidium.constants';
import { AppPath, VAULT_PARAM } from '$lib/constants/routes.constants';
import { HARVEST_AUTOPILOT_PROVIDER_ID } from '$lib/derived/harvest-autopilot-earning.derived';
import {
	liquidiumAssetNetworkIcons,
	liquidiumAssetNetworkNames,
	liquidiumPortfolio,
	liquidiumSupplyMarkets
} from '$lib/derived/liquidium.derived';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { earningProviders } from '$lib/providers/earning.providers';
import type { EarningTopRate } from '$lib/types/earning';
import type { EarningData, EarningProviderData } from '$lib/types/earning-provider';
import type { TokenId } from '$lib/types/token';
import { liquidiumMarketToken, liquidiumSupplyUrl } from '$lib/utils/liquidium.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const earningData: Readable<EarningData> = derived(
	earningProviders.map((p) => p.data),
	(dataValues) =>
		Object.fromEntries(earningProviders.map((provider, i) => [provider.id, dataValues[i]]))
);

export const highestApyEarningData: Readable<EarningProviderData | undefined> = derived(
	[earningData],
	([$earningData]) => {
		const entries = Object.values($earningData);

		if (entries.length === 0) {
			return;
		}

		return entries.reduce<EarningProviderData | undefined>((highest, record) => {
			const apyRaw = record[EarningCardFields.APY];
			const currentApy = Number(apyRaw);

			if (!Number.isFinite(currentApy)) {
				return highest;
			}

			if (isNullish(highest)) {
				return record;
			}

			const highestApy = Number(highest[EarningCardFields.APY]);

			return currentApy > highestApy ? record : highest;
		}, undefined);
	}
);

export const highestApyEarning: Readable<number> = derived(
	[highestApyEarningData],
	([$highestApyEarningData]) =>
		!isNaN(Number($highestApyEarningData?.[EarningCardFields.APY]))
			? Number($highestApyEarningData?.[EarningCardFields.APY])
			: 0
);

export const highestEarningPotentialUsd: Readable<number> = derived(
	[earningData],
	([$earningData]) =>
		Object.values($earningData).reduce<number>((acc, record) => {
			const potential = Number(record[EarningCardFields.EARNING_POTENTIAL]);
			return !isNaN(potential) ? Math.max(acc, potential) : acc;
		}, 0)
);

export const allEarningPositionsUsd: Readable<number> = derived([earningData], ([$earningData]) =>
	Object.values($earningData).reduce<number>(
		(acc, record) =>
			isNaN(Number(record[EarningCardFields.CURRENT_STAKED]))
				? acc
				: acc + Number(record[EarningCardFields.CURRENT_STAKED]),
		0
	)
);

export const allEarningYearlyAmountUsd = derived([earningData], ([$earningData]) =>
	Object.values($earningData).reduce<number>(
		(acc, record) =>
			isNaN(Number(record[EarningCardFields.CURRENT_EARNING]))
				? acc
				: acc + Number(record[EarningCardFields.CURRENT_EARNING]),
		0
	)
);

// The user's balance outside any earning position: the wallet total less the Autopilot vault tokens
// it counts. A Liquidium supply has already left the wallet, so there is nothing to take off for it.
export const earningUninvestedUsd: Readable<number> = derived(
	[enabledMainnetFungibleTokensUsdBalance, enabledHarvestAutopilotsUsdBalance],
	([$enabledMainnetFungibleTokensUsdBalance, $enabledHarvestAutopilotsUsdBalance]) =>
		Math.max(0, $enabledMainnetFungibleTokensUsdBalance - $enabledHarvestAutopilotsUsdBalance)
);

// One entry per Liquidium pool the user can supply, shown by its first rail (native first) with the
// networks of all its rails: every rail of a pool earns the same rate.
const liquidiumTopRates: Readable<Omit<EarningTopRate, 'earningPotentialUsd'>[]> = derived(
	[
		liquidiumSupplyMarkets,
		liquidiumAssetNetworkIcons,
		liquidiumAssetNetworkNames,
		liquidiumPortfolio,
		tokens
	],
	([
		$liquidiumSupplyMarkets,
		$liquidiumAssetNetworkIcons,
		$liquidiumAssetNetworkNames,
		$liquidiumPortfolio,
		$tokens
	]) =>
		$liquidiumSupplyMarkets.reduce<Omit<EarningTopRate, 'earningPotentialUsd'>[]>(
			(acc, { poolId, asset, chain, supplyApy }) => {
				const id = `${LIQUIDIUM_PROVIDER_ID}-${poolId}`;

				const token = liquidiumMarketToken({ chain, asset, tokens: $tokens });

				if (isNullish(token)) {
					return acc;
				}

				// A further rail of a pool already listed only adds the token it is entered with.
				if (acc.some((topRate) => topRate.id === id)) {
					return acc.map((topRate) =>
						topRate.id === id ? { ...topRate, tokenIds: [...topRate.tokenIds, token.id] } : topRate
					);
				}

				return [
					...acc,
					{
						id,
						providerId: LIQUIDIUM_PROVIDER_ID,
						token,
						tokenIds: [token.id],
						symbol: asset,
						networkIcons: $liquidiumAssetNetworkIcons[asset] ?? [],
						networkNames: $liquidiumAssetNetworkNames[asset] ?? [],
						apy: supplyApy,
						hasPosition: ($liquidiumPortfolio?.reserves ?? []).some(
							(reserve) => reserve.poolId === poolId && reserve.deposited > ZERO
						),
						action: (source) => goto(liquidiumSupplyUrl({ asset, source }))
					}
				];
			},
			[]
		)
);

const harvestAutopilotTopRates: Readable<Omit<EarningTopRate, 'earningPotentialUsd'>[]> = derived(
	[harvestAutopilots, tokens],
	([$harvestAutopilots, $tokens]) =>
		$harvestAutopilots.reduce<Omit<EarningTopRate, 'earningPotentialUsd'>[]>(
			(acc, { token, apy }) => {
				const apyNumber = Number(apy);

				if (isNullish(apy) || !Number.isFinite(apyNumber)) {
					return acc;
				}

				const {
					address,
					assetAddress,
					assetSymbol,
					assetIcon,
					network: { id: networkId, icon, name }
				} = token;

				const assetToken = $tokens.find(
					(candidate) =>
						candidate.network.id === networkId &&
						isTokenErc20(candidate) &&
						candidate.address.toLowerCase() === assetAddress.toLowerCase()
				);

				return [
					...acc,
					{
						id: `${HARVEST_AUTOPILOT_PROVIDER_ID}-${address}`,
						providerId: HARVEST_AUTOPILOT_PROVIDER_ID,
						// The asset's logo rather than the vault's, as the Earning tab shows it.
						token: { ...token, icon: assetIcon ?? token.icon },
						tokenIds: nonNullish(assetToken) ? [assetToken.id] : [],
						symbol: assetSymbol,
						networkIcons: nonNullish(icon) ? [icon] : [],
						networkNames: [name],
						apy: apyNumber,
						hasPosition: nonNullish(token.balance) && token.balance > ZERO,
						action: () => goto(`${AppPath.EarnAutopilot}?${VAULT_PARAM}=${address}`)
					}
				];
			},
			[]
		)
);

// Opportunities at or above the top-rate threshold, best rate first. The earning potential is based
// on the same uninvested balance for all of them, so they differ only by rate.
export const earningTopRates: Readable<EarningTopRate[]> = derived(
	[liquidiumTopRates, harvestAutopilotTopRates, earningUninvestedUsd],
	([$liquidiumTopRates, $harvestAutopilotTopRates, $earningUninvestedUsd]) =>
		[...$liquidiumTopRates, ...$harvestAutopilotTopRates]
			.filter(({ apy }) => apy >= EARNING_TOP_RATE_MIN_APY)
			.sort((a, b) => b.apy - a.apy)
			.map((topRate) => ({
				...topRate,
				earningPotentialUsd: ($earningUninvestedUsd * topRate.apy) / 100
			}))
);

// The best top rate for each token it can be entered with, for the tag beside a token in the Tokens
// list. Empty while the Earn page it opens is turned off.
export const earningTopRateApyByTokenId: Readable<Map<TokenId, number>> = derived(
	[earningTopRates],
	([$earningTopRates]) =>
		EARNING_ENABLED
			? $earningTopRates.reduce((acc, { tokenIds, apy }) => {
					tokenIds.forEach((tokenId) => acc.set(tokenId, Math.max(apy, acc.get(tokenId) ?? 0)));
					return acc;
				}, new Map<TokenId, number>())
			: new Map()
);
