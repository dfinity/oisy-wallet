import type { Erc20Token } from '$eth/types/erc20';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const erc20CustomTokensStore = initCertifiedCustomTokensStore<Erc20Token>();
