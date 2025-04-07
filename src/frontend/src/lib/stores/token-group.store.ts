import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';

export interface TokenGroupData {
	isExpanded: boolean;
	hideZeros: boolean;
}

export const tokenGroupStore = initCertifiedSetterStore<TokenGroupData>();
