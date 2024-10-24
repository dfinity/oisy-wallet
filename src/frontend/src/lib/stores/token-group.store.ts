import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';

export interface TokenGroupData {
	isExpanded: boolean;
}

export const tokenGroupStore = initCertifiedSetterStore<TokenGroupData>();
