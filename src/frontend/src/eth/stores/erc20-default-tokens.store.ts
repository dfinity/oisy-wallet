import type { Erc20Token } from '$eth/types/erc20';
import { initDefaultTokensStore } from '$lib/stores/default-tokens.store';

export const erc20DefaultTokensStore = initDefaultTokensStore<Erc20Token>();
