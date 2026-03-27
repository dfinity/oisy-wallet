import type { Erc4626Token } from '$eth/types/erc4626';
import { initDefaultTokensStore } from '$lib/stores/default-tokens.store';

export const erc4626DefaultTokensStore = initDefaultTokensStore<Erc4626Token>();
