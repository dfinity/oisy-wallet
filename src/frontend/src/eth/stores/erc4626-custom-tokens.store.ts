import type { Erc4626Token } from '$eth/types/erc4626';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const erc4626CustomTokensStore = initCertifiedCustomTokensStore<Erc4626Token>();
