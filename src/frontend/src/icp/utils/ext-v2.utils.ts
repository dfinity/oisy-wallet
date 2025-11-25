import type { ExtToken } from '$icp/types/ext-token';
import type { IcToken } from '$icp/types/ic-token';

export const isTokenExtV2 = (token: Partial<IcToken>): token is ExtToken =>
	token.standard === 'extV2';
