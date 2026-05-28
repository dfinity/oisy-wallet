import { goto } from '$app/navigation';
import { EarningCardFields } from '$env/types/env.earning-cards';
import {
	enabledHarvestAutopilotsUsdBalance,
	harvestAutopilots,
	harvestAutopilotsCurrentEarning,
	harvestAutopilotsMaxApy,
	harvestAutopilotsUsdBalance
} from '$eth/derived/harvest-autopilots.derived';
import { AppPath } from '$lib/constants/routes.constants';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import type { EarningProviderData } from '$lib/types/earning-provider';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const HARVEST_AUTOPILOT_PROVIDER_ID = 'harvest-autopilot';

export const harvestAutopilotEarningData: Readable<EarningProviderData> = derived(
	[
		enabledMainnetFungibleTokensUsdBalance,
		harvestAutopilotsUsdBalance,
		enabledHarvestAutopilotsUsdBalance,
		harvestAutopilotsCurrentEarning,
		harvestAutopilots,
		harvestAutopilotsMaxApy
	],
	([
		$enabledMainnetFungibleTokensUsdBalance,
		$harvestAutopilotsUsdBalance,
		$enabledHarvestAutopilotsUsdBalance,
		$harvestAutopilotsCurrentEarning,
		$harvestAutopilots,
		$harvestAutopilotsMaxApy
	]): EarningProviderData => ({
		[EarningCardFields.APY]: $harvestAutopilotsMaxApy,
		[EarningCardFields.CURRENT_EARNING]: $harvestAutopilotsCurrentEarning,
		[EarningCardFields.CURRENT_STAKED]: $harvestAutopilotsUsdBalance,
		[EarningCardFields.NETWORKS]: [
			...$harvestAutopilots.reduce<Set<string>>(
				(acc, { token: { network } }) => (nonNullish(network.icon) ? acc.add(network.icon) : acc),
				new Set()
			)
		],
		[EarningCardFields.ASSETS]: [
			...$harvestAutopilots.reduce<Set<string>>(
				(acc, { token: { assetIcon } }) => (nonNullish(assetIcon) ? acc.add(assetIcon) : acc),
				new Set()
			)
		],
		[EarningCardFields.EARNING_POTENTIAL]: nonNullish($enabledMainnetFungibleTokensUsdBalance)
			? (($enabledMainnetFungibleTokensUsdBalance - $enabledHarvestAutopilotsUsdBalance) *
					Number($harvestAutopilotsMaxApy)) /
				100
			: undefined,
		action: () => goto(AppPath.EarnAutopilot)
	})
);
