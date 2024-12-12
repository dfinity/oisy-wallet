import { initSetterStore } from '$lib/stores/setter.store';

export interface TokenGroupData {
	isExpanded: boolean;
}

export const tokenGroupStore = initSetterStore<TokenGroupData>();
