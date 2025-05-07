import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { TokenGroupId } from '$lib/types/token-group';

export interface TokenGroupData {
	isExpanded: boolean;
	hideZeros: boolean;
}

export const tokenGroupStore = initCertifiedSetterStore<TokenGroupData, TokenGroupId>();
