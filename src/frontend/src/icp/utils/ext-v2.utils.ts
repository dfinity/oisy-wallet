import type { IcToken } from '$icp/types/ic-token';

export const isTokenExtV2 = (token: Partial<IcToken>): token is IcToken =>
	token.standard === 'extV2';
