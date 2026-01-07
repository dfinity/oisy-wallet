import type { Dip721Token } from '$icp/types/dip721-token';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const dip721CustomTokensStore = initCertifiedCustomTokensStore<Dip721Token>();
