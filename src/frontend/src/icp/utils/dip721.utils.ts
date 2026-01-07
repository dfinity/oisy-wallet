import type { Dip721Token } from '$icp/types/dip721-token';
import type { IcToken } from '$icp/types/ic-token';

export const isTokenDip721 = (token: Partial<IcToken>): token is Dip721Token =>
	token.standard?.code === 'dip721';
