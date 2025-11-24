import type { ExtToken } from '$icp/types/ext-token';
import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';

export const extCustomTokensStore = initCertifiedUserTokensStore<ExtToken>();
