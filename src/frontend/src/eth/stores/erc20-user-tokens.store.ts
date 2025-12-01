import type { Erc20Token } from '$eth/types/erc20';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

// TODO: UserToken is deprecated - replace this store with erc20CustomTokensStore (already exists)
export const erc20UserTokensStore = initCertifiedCustomTokensStore<Erc20Token>();
