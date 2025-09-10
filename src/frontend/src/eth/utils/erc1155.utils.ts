import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Token } from '$lib/types/token';
import type { NftCollection } from '$lib/types/nft';

export const isTokenErc1155 = (token: Token): token is Erc1155Token => token.standard === 'erc1155';

export const isCollectionErc1155 = (collection: NftCollection) => collection.standard === 'erc1155';

export const isTokenErc1155CustomToken = (token: Token): token is Erc1155CustomToken =>
	isTokenErc1155(token) && 'enabled' in token;
