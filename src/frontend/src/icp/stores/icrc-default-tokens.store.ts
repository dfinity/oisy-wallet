import { initCertifiedIcrcTokensStore } from '$icp/stores/certified-icrc.store';
import type { IcToken } from '$icp/types/ic-token';

export const icrcDefaultTokensStore = initCertifiedIcrcTokensStore<IcToken>();
