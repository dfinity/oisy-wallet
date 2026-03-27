import type { IcPunksToken } from '$icp/types/icpunks-token';
import { initCertifiedCustomTokensStore } from '$lib/stores/custom-tokens.store';

export const icPunksCustomTokensStore = initCertifiedCustomTokensStore<IcPunksToken>();
