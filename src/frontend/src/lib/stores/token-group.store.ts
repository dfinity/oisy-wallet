import { initStorageSetterStore } from '$lib/stores/storage-setter.store';

export interface TokenGroupData {
	expanded: boolean;
}

export const tokenGroupStore = initStorageSetterStore<TokenGroupData>({ key: 'group-tokens' });
