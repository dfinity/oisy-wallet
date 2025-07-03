import type { Erc20Token } from '$eth/types/erc20';
import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';

// TODO: use initCertifiedIcrcTokensStore when we deprecate initCertifiedUserTokensStore
export const erc20CustomTokensStore = initCertifiedUserTokensStore<Erc20Token>();
