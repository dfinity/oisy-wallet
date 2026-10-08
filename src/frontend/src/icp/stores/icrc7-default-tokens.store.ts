import type { Icrc7Token } from '$icp/types/icrc7-token';
import { initDefaultTokensStore } from '$lib/stores/default-tokens.store';

export const icrc7DefaultTokensStore = initDefaultTokensStore<Icrc7Token>();
