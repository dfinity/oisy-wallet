import type { ExtToken } from '$icp/types/ext-token';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const dip721CustomTokensStore = initCertifiedCustomTokensStore<ExtToken>();
