import type { Dip721CustomToken } from '$icp/types/dip721-custom-token';
import type { Dip721Token } from '$icp/types/dip721-token';
import type { IcToken } from '$icp/types/ic-token';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const isTokenDip721 = (token: Partial<IcToken>): token is Dip721Token =>
	token.standard?.code === 'dip721';

export const isTokenDip721CustomToken = (token: Token): token is Dip721CustomToken =>
	isTokenDip721(token) && isTokenToggleable(token);
