import type { ErcFungibleToken } from '$eth/types/erc-fungible';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import type { Token } from '$lib/types/token';

export const isTokenErcFungible = (token: Token): token is ErcFungibleToken =>
	isTokenErc20(token) || isTokenErc4626(token);
