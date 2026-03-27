import type { Erc1155Token } from '$eth/types/erc1155';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const erc1155CustomTokensStore = initCertifiedCustomTokensStore<Erc1155Token>();
