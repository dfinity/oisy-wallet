import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { isTokenExtV2 } from '$icp/utils/ext.utils';
import type { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import type {
	Nft,
	NonFungibleToken,
	NonFungibleTokenIdentifier,
	NonFungibleTokensByNetwork
} from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

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
 * Uses the OISY ID if available, otherwise falls back to the ID.
 *
 * @param nft - for which the ID to display should be found
 * @returns the ID to display for the NFT
 */
export const getNftDisplayId = (nft: Nft): string => nft.oisyId ?? nft.id;

/**
 * Gets the image URL to display for the given NFT.
 *
 * Uses the thumbnail URL if available, otherwise falls back to the image URL.
 *
 * @param nft - the NFT for which to get the display image URL
 * @returns the thumbnail URL if defined, otherwise the image URL
 */
export const getNftDisplayImageUrl = (nft: Nft): string | undefined =>
	nft.thumbnailUrl ?? nft.imageUrl;

/**
 * Gets the media status to display for the given NFT.
 *
 * If the NFT has a thumbnail URL, the thumbnail status is returned.
 * Otherwise, the image status is returned.
 *
 * @param nft - the NFT for which to get the display media status
 * @returns the thumbnail status if defined, otherwise the image status
 */
export const getNftDisplayMediaStatus = (nft: Nft): NftMediaStatusEnum =>
	nonNullish(nft.thumbnailUrl) ? nft.mediaStatus.thumbnail : nft.mediaStatus.image;
