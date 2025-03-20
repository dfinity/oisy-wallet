import { initStorageStore } from '$lib/stores/storage.store';

export interface SettingsData {
	enabled: boolean;
}

export const hideZeroBalancesStore = initStorageStore<SettingsData>({ key: 'hide-zero-balances' });
export const enabledNetworksStore = initStorageStore<{ [id: symbol]: boolean }>({
	key: 'enabledNetworksStore'
});
