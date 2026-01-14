import type { Erc721Token } from '$eth/types/erc721';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const erc721CustomTokensStore = initCertifiedCustomTokensStore<Erc721Token>();
