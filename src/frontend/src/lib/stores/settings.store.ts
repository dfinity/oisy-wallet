import { TokenTypes as TokenTypesEnum, type TokenTypes } from '$lib/enums/token-types';
import { initStorageStore } from '$lib/stores/storage.store';
import type { TokenCategoryFilterData } from '$lib/types/tokens-filter';
import type { TokensSortingType } from '$lib/types/tokens-sort';

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

export const hiddenMicroTransactionsResetStore = initStorageStore<SettingsData>({
	key: 'hidden-micro-transactions-reset',
	defaultValue: { enabled: false }
});

export const tokensSortStore = initStorageStore<TokensSortingType>({
	key: 'tokens-sort',
	defaultValue: {
		type: 'value'
	}
});

export const hideTokenCategoryFilterStore = initStorageStore<SettingsData>({
	key: 'hide-token-category-filter',
	defaultValue: { enabled: false }
});

export const tokenCategoryFilterStore = initStorageStore<TokenCategoryFilterData>({
	key: 'token-category-filter',
	defaultValue: { value: undefined }
});

export const showTokenStandardFilterStore = initStorageStore<SettingsData>({
	key: 'show-token-standard-filter',
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

export const activeAssetsTabStore = initStorageStore<TokenTypes>({
	key: 'active-assets-tab',
	defaultValue: TokenTypesEnum.TOKENS
});
