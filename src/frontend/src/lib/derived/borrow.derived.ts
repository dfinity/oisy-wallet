import { borrowProviders } from '$lib/providers/borrow.providers';
import type { EarningData } from '$lib/types/earning-provider';
import { derived, readable, type Readable } from 'svelte/store';

// Keyed provider → card-fields map (mirrors `earningData`). `readable({})` guards the
// no-provider case, where `derived([])` would never emit.
export const borrowData: Readable<EarningData> =
	borrowProviders.length > 0
		? derived(
				borrowProviders.map((p) => p.data),
				(dataValues) =>
					Object.fromEntries(borrowProviders.map((provider, i) => [provider.id, dataValues[i]]))
			)
		: readable<EarningData>({});
