import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { isTokenExtV2 } from '$icp/utils/ext.utils';
import type {
	Nft,
	NonFungibleToken,
	NonFungibleTokenIdentifier,
	NonFungibleTokensByNetwork
} from '$lib/types/nft';
import type { Token } from '$lib/types/token';

export const isTokenNonFungible = (token: Token): token is NonFungibleToken =>
	isTokenErc721(token) || isTokenErc1155(token);

export const isTokenFungible = (token: Token): boolean => !isTokenNonFungible(token);

export const getTokensByNetwork = (tokens: NonFungibleToken[]): NonFungibleTokensByNetwork =>
	tokens.reduce<NonFungibleTokensByNetwork>((acc, token) => {
		const networkId = token.network.id;
		return acc.set(networkId, [...(acc.get(networkId) ?? []), token]);
	}, new Map());

export const getNftIdentifier = (token: NonFungibleToken): NonFungibleTokenIdentifier =>
	isTokenExtV2(token) ? token.canisterId : token.address;

/**
 * Gets the ID to display for the given NFT.
 *
 * @param nft - for which the ID to display should be found
 * @returns the ID to display for the NFT
 */
export const getNftDisplayId = (nft: Nft): string => nft.oisyId ?? nft.id;
