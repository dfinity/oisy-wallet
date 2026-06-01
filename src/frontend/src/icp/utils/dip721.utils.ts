import type { Dip721CustomToken } from '$icp/types/dip721-custom-token';
import type { Dip721Token } from '$icp/types/dip721-token';
import type { IcToken } from '$icp/types/ic-token';
import { toggleableTokenGuard } from '$lib/utils/token-guards.utils';

export const isTokenDip721 = (token: Partial<IcToken>): token is Dip721Token =>
	token.standard?.code === 'dip721';

export const isTokenDip721CustomToken = toggleableTokenGuard<Dip721CustomToken>(isTokenDip721);
