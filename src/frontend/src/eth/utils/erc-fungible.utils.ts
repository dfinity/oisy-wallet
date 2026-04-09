import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626Token } from '$eth/types/erc4626';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import type { Token } from '$lib/types/token';

export type ErcFungibleToken = Erc20Token | Erc4626Token;

export const isTokenErcFungible = (token: Token): token is ErcFungibleToken =>
	isTokenErc20(token) || isTokenErc4626(token);
