import { goto } from '$app/navigation';
import { earningProviderConfigs } from '$env/earning-providers.env';
import { rewardCampaigns } from '$env/reward-campaigns.env';
import { AppPath } from '$lib/constants/routes.constants';
import {
	HARVEST_AUTOPILOT_PROVIDER_ID,
	harvestAutopilotEarningData
} from '$lib/derived/harvest-autopilot-earning.derived';
import type { EarningProvider, EarningProviderData } from '$lib/types/earning-provider';
import { nonNullish } from '@dfinity/utils';
import { readable, type Readable } from 'svelte/store';

const currentReward = rewardCampaigns[rewardCampaigns.length - 1];

const earningDataStores: Record<string, Readable<EarningProviderData> | undefined> = {
	[HARVEST_AUTOPILOT_PROVIDER_ID]: harvestAutopilotEarningData,
	...(nonNullish(currentReward)
		? {
				[currentReward.id]: readable<EarningProviderData>({
					action: () => goto(AppPath.EarnRewards)
				})
			}
		: {})
};

export const earningProviders: EarningProvider[] = earningProviderConfigs
	.map(({ type, ...card }): EarningProvider | undefined => {
		const data = earningDataStores[card.id];

		if (!data) {
			return undefined;
		}

		return { id: card.id, type, card, data };
	})
	.filter(nonNullish);
