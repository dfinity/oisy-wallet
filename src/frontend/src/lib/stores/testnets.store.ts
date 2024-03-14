import { initStorageStore } from '$lib/stores/storage.store';

export interface TestnetsData {
	enabled: boolean;
}

export const testnetsStore = initStorageStore<TestnetsData>({ key: 'testnets' });
