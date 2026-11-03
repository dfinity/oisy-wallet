import { earningProviderConfigs } from '$env/earning-providers.env';
import { anyLendBorrowProviderEnabled } from '$env/lend-borrow';
import { LIQUIDIUM_PROVIDER_ID } from '$lib/constants/liquidium.constants';
import {
	HARVEST_AUTOPILOT_PROVIDER_ID,
	harvestAutopilotEarningData
} from '$lib/derived/harvest-autopilot-earning.derived';
import { liquidiumEarningData } from '$lib/derived/liquidium.derived';
import type { EarningProvider, EarningProviderData } from '$lib/types/earning-provider';
import { nonNullish } from '@dfinity/utils';
import type { Readable } from 'svelte/store';

const earningDataStores: Record<string, Readable<EarningProviderData> | undefined> = {
	[HARVEST_AUTOPILOT_PROVIDER_ID]: harvestAutopilotEarningData,
	...(anyLendBorrowProviderEnabled ? { [LIQUIDIUM_PROVIDER_ID]: liquidiumEarningData } : {})
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
