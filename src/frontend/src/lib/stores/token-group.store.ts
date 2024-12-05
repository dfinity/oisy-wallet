import { initStorageSetterStore } from '$lib/stores/storage-setter.store';

export interface TokenGroupData {
	isExpanded: boolean;
}

export const tokenGroupStore = initStorageSetterStore<TokenGroupData>({ key: 'group-tokens' });
