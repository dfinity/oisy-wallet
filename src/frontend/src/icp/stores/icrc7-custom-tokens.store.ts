import type { Icrc7Token } from '$icp/types/icrc7-token';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const icrc7CustomTokensStore = initCertifiedCustomTokensStore<Icrc7Token>();
