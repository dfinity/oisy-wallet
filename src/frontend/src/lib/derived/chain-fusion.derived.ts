import { chainFusionStore } from '$lib/stores/chain-fusion.store';
import { derived, type Readable } from 'svelte/store';

export const chainFusionOnlyTestnets: Readable<boolean> = derived(
	[chainFusionStore],
	([$chainFusionStore]) => $chainFusionStore?.onlyTestnets ?? false
);
