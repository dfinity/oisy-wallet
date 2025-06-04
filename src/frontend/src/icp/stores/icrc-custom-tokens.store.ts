import { initCertifiedIcrcTokensStore } from '$icp/stores/certified-icrc.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';

export const icrcCustomTokensStore = initCertifiedIcrcTokensStore<IcrcCustomToken>();
