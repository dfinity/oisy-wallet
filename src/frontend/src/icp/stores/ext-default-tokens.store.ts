import type { ExtToken } from '$icp/types/ext-token';
import { initDefaultTokensStore } from '$lib/stores/default-tokens.store';

export const extDefaultTokensStore = initDefaultTokensStore<ExtToken>();
