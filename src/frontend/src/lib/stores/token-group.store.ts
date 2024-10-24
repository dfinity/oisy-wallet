import { initSetterStore } from '$lib/stores/setter.store';

export interface TokenGroupData {
	expanded: boolean;
}

export const tokenGroupStore = initSetterStore<TokenGroupData>();
