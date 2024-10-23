import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';

export interface TokenGroupData {
	expanded: boolean;
}

//todo: replace with TokenGroupId
export interface TokenGroupsData {
	[key: symbol]: TokenGroupData;
}

//todo: replace with TokenGroupId
export const tokenGroupStore = initCertifiedSetterStore<symbol, TokenGroupsData>();
