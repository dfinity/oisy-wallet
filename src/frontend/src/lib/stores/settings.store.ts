import { initStorageStore } from '$lib/stores/storage.store';

export interface SettingsData {
	enabled: boolean;
}

export const testnetsStore = initStorageStore<SettingsData>({ key: 'testnets' });
export const hideZeroBalancesStore = initStorageStore<SettingsData>({ key: 'hide-zero-balances' });
