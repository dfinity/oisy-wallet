import type { IcToken } from '$icp/types/ic-token';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const icrcCustomTokensStore = initCertifiedCustomTokensStore<IcToken>();
