import { initStorageStore } from '$lib/stores/storage.store';

interface ChainFusionData {
	onlyTestnets: boolean;
}

export const chainFusionStore = initStorageStore<ChainFusionData>({
	key: 'chain-fusion'
});
