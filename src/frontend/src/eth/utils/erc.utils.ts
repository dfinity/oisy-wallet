import type { ErcFungibleToken } from '$eth/types/erc-fungible';
import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc721Token } from '$eth/types/erc721';
import { isTokenErcFungible } from '$eth/utils/erc-fungible.utils';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import type { Token } from '$lib/types/token';

export const isTokenErc = (token: Token): token is ErcFungibleToken | Erc721Token | Erc1155Token =>
	isTokenErcFungible(token) || isTokenErc721(token) || isTokenErc1155(token);
