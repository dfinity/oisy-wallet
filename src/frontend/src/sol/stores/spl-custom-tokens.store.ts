import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';
import type { SplToken } from '$sol/types/spl';

export const splCustomTokensStore = initCertifiedCustomTokensStore<SplToken>();
