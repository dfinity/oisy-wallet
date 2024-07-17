import type { UserProfile } from '$declarations/backend/backend.did';
import { initStorageStore } from '$lib/stores/storage.store';

export interface SettingsData {
	enabled: boolean;
}

export const testnetsStore = initStorageStore<SettingsData>({ key: 'testnets' });
export const hideZeroBalancesStore = initStorageStore<SettingsData>({ key: 'hide-zero-balances' });
export const userProfileStore = initStorageStore<UserProfile>({ key: 'user-profile' });
