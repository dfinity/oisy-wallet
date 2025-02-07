import { initDefaultTokensStore } from '$lib/stores/default-tokens.store';
import type { SplToken } from '$sol/types/spl';

export const splDefaultTokensStore = initDefaultTokensStore<SplToken>();
