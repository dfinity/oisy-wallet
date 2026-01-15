import type { ExtToken } from '$icp/types/ext-token';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const extCustomTokensStore = initCertifiedCustomTokensStore<ExtToken>();
