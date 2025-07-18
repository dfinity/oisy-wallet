import type { Erc721Token } from '$eth/types/erc721';
import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';

export const erc721CustomTokensStore = initCertifiedUserTokensStore<Erc721Token>();
