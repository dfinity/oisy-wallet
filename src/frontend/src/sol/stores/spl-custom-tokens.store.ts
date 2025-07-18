import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';
import type { SplToken } from '$sol/types/spl';

// TODO: UserToken is deprecated - rename this store initCertifiedUserTokensStore
export const splCustomTokensStore = initCertifiedUserTokensStore<SplToken>();
