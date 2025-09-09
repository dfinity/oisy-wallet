import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc721Token } from '$eth/types/erc721';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import type { NonFungibleToken, NonFungibleTokensByNetwork } from '$lib/types/nft';
import type { Token } from '$lib/types/token';

export const isTokenNonFungible = (token: Token): token is Erc721Token | Erc1155Token =>
	isTokenErc721(token) || isTokenErc1155(token);

export const isTokenFungible = (token: Token): boolean => !isTokenNonFungible(token);

export const getTokensByNetwork = (tokens: NonFungibleToken[]): NonFungibleTokensByNetwork =>
	tokens.reduce<NonFungibleTokensByNetwork>((acc, token) => {
		const networkId = token.network.id;
		return acc.set(networkId, [...(acc.get(networkId) ?? []), token]);
	}, new Map());
