import { goto } from '$app/navigation';
import { EarningCardFields } from '$env/types/env.earning-cards';
import {
	HARVEST_AUTOPILOT_ASSET_ICONS,
	HARVEST_AUTOPILOT_NETWORK_ICONS
} from '$eth/constants/harvest-autopilots.constants';
import {
	enabledHarvestAutopilotsUsdBalance,
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
		harvestAutopilotsMaxApy
	],
	([
		$enabledMainnetFungibleTokensUsdBalance,
		$harvestAutopilotsUsdBalance,
		$enabledHarvestAutopilotsUsdBalance,
		$harvestAutopilotsCurrentEarning,
		$harvestAutopilotsMaxApy
	]): EarningProviderData => ({
		[EarningCardFields.APY]: $harvestAutopilotsMaxApy,
		[EarningCardFields.CURRENT_EARNING]: $harvestAutopilotsCurrentEarning,
		[EarningCardFields.CURRENT_STAKED]: $harvestAutopilotsUsdBalance,
		[EarningCardFields.NETWORKS]: HARVEST_AUTOPILOT_NETWORK_ICONS,
		[EarningCardFields.ASSETS]: HARVEST_AUTOPILOT_ASSET_ICONS,
		[EarningCardFields.EARNING_POTENTIAL]: nonNullish($enabledMainnetFungibleTokensUsdBalance)
			? (($enabledMainnetFungibleTokensUsdBalance - $enabledHarvestAutopilotsUsdBalance) *
					Number($harvestAutopilotsMaxApy)) /
				100
			: undefined,
		action: () => goto(AppPath.EarnAutopilot)
	})
);
