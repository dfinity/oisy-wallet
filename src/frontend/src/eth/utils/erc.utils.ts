import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc721Token } from '$eth/types/erc721';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import type { Token } from '$lib/types/token';

export const isTokenErc = (token: Token): token is Erc20Token | Erc721Token | Erc1155Token =>
	isTokenErc20(token) || isTokenErc721(token) || isTokenErc1155(token);
