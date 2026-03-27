import type { IcPunksToken } from '$icp/types/icpunks-token';
import { initDefaultTokensStore } from '$lib/stores/default-tokens.store';

export const icPunksDefaultTokensStore = initDefaultTokensStore<IcPunksToken>();
