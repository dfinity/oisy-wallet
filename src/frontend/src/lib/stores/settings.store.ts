import { TokenTypes as TokenTypesEnum, type TokenTypes } from '$lib/enums/token-types';
import { initStorageStore } from '$lib/stores/storage.store';

export interface SettingsData {
	enabled: boolean;
}

export const hideZeroBalancesStore = initStorageStore<SettingsData>({
	key: 'hide-zero-balances',
	defaultValue: { enabled: false }
});

export const privacyModeStore = initStorageStore<SettingsData>({
	key: 'privacy-mode',
	defaultValue: { enabled: false }
});

export const showHiddenStore = initStorageStore<SettingsData>({
	key: 'show-hidden',
	defaultValue: { enabled: false }
});

export const showSpamStore = initStorageStore<SettingsData>({
	key: 'show-spam',
	defaultValue: { enabled: false }
});

export type NftSortOrder = 'asc' | 'desc';
export type NftSortType = 'collection-name' | 'date';

export interface NftSortingType {
	order: NftSortOrder;
	type: NftSortType;
}

export const nftSortStore = initStorageStore<NftSortingType>({
	key: 'nft-sort',
	defaultValue: {
		order: 'asc',
		type: 'collection-name'
	}
});

export const nftGroupByCollectionStore = initStorageStore<boolean>({
	key: 'nft-group-by-collection',
	defaultValue: true
});

export const userSelectedNetworkStore = initStorageStore<string | undefined>({
	key: 'user-selected-network',
	defaultValue: 'eth'
});

export const activeAssetsTabStore = initStorageStore<TokenTypes>({
	key: 'active-assets-tab',
	defaultValue: TokenTypesEnum.TOKENS
});
