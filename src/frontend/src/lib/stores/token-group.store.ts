import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';

export interface TokenGroupData {
	expanded: boolean;
}

export const tokenGroupStore = initCertifiedSetterStore<TokenGroupData>();
