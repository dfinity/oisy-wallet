import { initStorageStore} from '$lib/stores/storage.store';

export interface TokenGroupData {
	expanded: boolean;
}

export interface TokenGroupsData {
	[key: string]: TokenGroupData;
}

export const tokenGroupStore = initStorageStore<TokenGroupsData>({ key: 'token-groups' });
