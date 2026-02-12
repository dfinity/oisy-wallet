import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const isTokenErc4626 = (token: Token): token is Erc4626Token =>
	token.standard.code === 'erc4626';

export const isTokenErc4626CustomToken = (token: Token): token is Erc4626CustomToken =>
	isTokenErc4626(token) && isTokenToggleable(token);
