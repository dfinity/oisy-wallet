import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { NftCollection } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const isTokenErc1155 = (token: Token): token is Erc1155Token =>
	token.standard.code === 'erc1155';

export const isCollectionErc1155 = (collection: NftCollection) =>
	collection.standard.code === 'erc1155';

export const isTokenErc1155CustomToken = (token: Token): token is Erc1155CustomToken =>
	isTokenErc1155(token) && isTokenToggleable(token);
