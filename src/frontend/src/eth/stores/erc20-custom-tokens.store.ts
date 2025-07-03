import type { Erc20Token } from '$eth/types/erc20';
import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';

// TODO: UserToken is deprecated - rename this store initCertifiedUserTokensStore
export const erc20CustomTokensStore = initCertifiedUserTokensStore<Erc20Token>();
