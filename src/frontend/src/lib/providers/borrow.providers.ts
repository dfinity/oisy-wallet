import { borrowProviderConfigs } from '$env/borrow-providers.env';
import { anyLendBorrowProviderEnabled } from '$env/lend-borrow';
import { LIQUIDIUM_PROVIDER_ID } from '$lib/constants/liquidium.constants';
import { liquidiumBorrowData } from '$lib/derived/liquidium.derived';
import type { EarningProvider, EarningProviderData } from '$lib/types/earning-provider';
import { nonNullish } from '@dfinity/utils';
import type { Readable } from 'svelte/store';

// The data-store registration is itself the feature gate: off-flag there is no store, so the
// JSON entry is filtered out (mirrors the Earn-page provider pattern).
const borrowDataStores: Record<string, Readable<EarningProviderData> | undefined> = {
	...(anyLendBorrowProviderEnabled ? { [LIQUIDIUM_PROVIDER_ID]: liquidiumBorrowData } : {})
};

export const borrowProviders: EarningProvider[] = borrowProviderConfigs
	.map(({ type, ...card }): EarningProvider | undefined => {
		const data = borrowDataStores[card.id];

		if (!data) {
			return undefined;
		}

		return { id: card.id, type, card, data };
	})
	.filter(nonNullish);
