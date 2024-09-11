import { initStorageStore } from '$lib/stores/storage.store';

interface ToggleableSettingsData {
	enabled: boolean;
}

interface SelectableSettingsData {
	option: string;
}

export const testnetsStore = initStorageStore<ToggleableSettingsData>({ key: 'testnets' });
export const hideZeroBalancesStore = initStorageStore<ToggleableSettingsData>({
	key: 'hide-zero-balances'
});
export const selectedNetworkStore = initStorageStore<SelectableSettingsData>({
	key: 'selected-network'
});
