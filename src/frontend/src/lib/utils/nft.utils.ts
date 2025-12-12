import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { isTokenExtV2 } from '$icp/utils/ext.utils';
import type { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import type {
	Nft,
	NftAttribute,
	NonFungibleToken,
	NonFungibleTokenIdentifier,
	NonFungibleTokensByNetwork
} from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const isTokenNonFungible = (token: Token): token is NonFungibleToken =>
	isTokenErc721(token) || isTokenErc1155(token) || isTokenExtV2(token);

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

/**
 * Gets the display name for the given NFT.
 *
 * If the NFT has a name, it is returned.
 * Otherwise, the collection name is returned.
 * In either case, the ID is appended to the display name.
 * If neither is available, the ID is returned.
 *
 * @param nft - the NFT for which to get the display name
 * @returns the display name for the NFT
 */
export const getNftDisplayName = (nft: Nft): string => {
	const {
		name,
		collection: { name: collectionName }
	} = nft;

	const idToUse = getNftDisplayId(nft);

	if (nonNullish(name)) {
		// sometimes NFT names include the number itself, in that case we do not display the number
		return name.includes(`#${idToUse}`) ? name : `${name} #${idToUse}`;
	}

	if (nonNullish(collectionName)) {
		return `${collectionName} #${idToUse}`;
	}

	return `#${idToUse}`;
};

export const mapNftAttributes = (
	attributes:
		| {
				trait_type: string;
				value?: Option<string | number>;
		  }[]
		| Record<string, Option<string | number>>
		| undefined
		| null
): NftAttribute[] => {
	if (isNullish(attributes)) {
		return [];
	}

	if (Array.isArray(attributes)) {
		return attributes.map(({ trait_type: traitType, value }) => ({
			traitType,
			...(nonNullish(value) && { value: value.toString() })
		}));
	}

	if (typeof attributes === 'object') {
		return Object.entries(attributes).map(([traitType, value]) => ({
			traitType,
			...(nonNullish(value) && { value: value.toString() })
		}));
	}

	return [];
};
