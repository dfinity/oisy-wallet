import { initStorageStore } from '$lib/stores/storage.store';

export interface SettingsData {
	enabled: boolean;
}

/**
 * These types will come from Candid interface definitions once agreed and implemented in the backend.
 *
 * TODO: https://dfinity.atlassian.net/browse/GIX-2642
 */
type UserCredentialSummary = {
	credential_type: string;
	verified_date_timestamp: bigint;
	expire_date_timestamp: bigint;
};
type CredentialMap = Record<string, UserCredentialSummary>;
export type UserProfile = {
	credentials: CredentialMap;
	created_timestamp: bigint;
	updated_timestamp: bigint;
};

export const testnetsStore = initStorageStore<SettingsData>({ key: 'testnets' });
export const hideZeroBalancesStore = initStorageStore<SettingsData>({ key: 'hide-zero-balances' });
export const userProfileStore = initStorageStore<UserProfile>({ key: 'user-profile' });
