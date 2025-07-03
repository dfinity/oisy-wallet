import type { Erc20Token } from '$eth/types/erc20';
import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';

export const erc20CustomTokensStore = initCertifiedUserTokensStore<Erc20Token>();
