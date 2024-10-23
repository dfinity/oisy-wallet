import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { TokenId } from '$lib/types/token';
import type { CertifiedData } from '$lib/types/store';

//todo: Work with typed group id
export type TokenGroupsExpanded = Record<TokenId, boolean>;

export type TokenGroupsExpandedData = CertifiedData<TokenGroupsExpanded>;

export const tokenGroupStore = initCertifiedSetterStore<TokenGroupsExpandedData>();
