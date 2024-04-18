import { initCertifiedIcrcTokensStore } from '$icp/stores/certified-icrc.store';
import type { IcrcCustomToken, IcrcCustomTokenWithoutId } from '$icp/types/icrc-custom-token';

export const icrcCustomTokensStore = initCertifiedIcrcTokensStore<
	IcrcCustomTokenWithoutId,
	IcrcCustomToken
>();
