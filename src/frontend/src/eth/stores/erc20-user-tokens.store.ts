import type { Erc20Token } from '$eth/types/erc20';
import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';

export const erc20UserTokensStore = initCertifiedUserTokensStore<Erc20Token>();
