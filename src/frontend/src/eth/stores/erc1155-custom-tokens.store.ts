import type { Erc1155Token } from '$eth/types/erc1155';
import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';

export const erc1155CustomTokensStore = initCertifiedUserTokensStore<Erc1155Token>();
