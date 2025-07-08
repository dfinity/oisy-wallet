import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';
import type { Erc721Token } from '$eth/types/erc721';

export const erc721CustomTokensStore = initCertifiedUserTokensStore<Erc721Token>();