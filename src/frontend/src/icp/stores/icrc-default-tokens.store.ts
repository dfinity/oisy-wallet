import { initCertifiedIcrcTokensStore } from '$icp/stores/certified-icrc.store';
import type { IcToken, IcTokenWithoutId } from '$icp/types/ic-tokens';

export const icrcDefaultTokensStore = initCertifiedIcrcTokensStore<IcTokenWithoutId, IcToken>();
