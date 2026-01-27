import type { Erc721Token } from '$eth/types/erc721';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { NftCollection } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const isTokenErc721 = (token: Token): token is Erc721Token =>
	token.standard.code === 'erc721';

export const isCollectionErc721 = (collection: NftCollection) =>
	collection.standard.code === 'erc721';

export const isTokenErc721CustomToken = (token: Token): token is Erc721CustomToken =>
	isTokenErc721(token) && isTokenToggleable(token);
