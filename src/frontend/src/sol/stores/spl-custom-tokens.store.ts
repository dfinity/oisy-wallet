import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';
import type { SplToken } from '$sol/types/spl';

export const splCustomTokensStore = initCertifiedUserTokensStore<SplToken>();

