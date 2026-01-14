import type { TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import { metadata as getIcPunksMetadata } from '$icp/api/icpunks.api';
import { getExtMetadata } from '$icp/services/ext-metadata.services';
import type { Dip721Token } from '$icp/types/dip721-token';
import type { ExtToken } from '$icp/types/ext-token';
import type { IcPunksToken } from '$icp/types/icpunks-token';
import { extIndexToIdentifier, parseExtTokenIndex } from '$icp/utils/ext.utils';
import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import type { Nft, NftCollection } from '$lib/types/nft';
import { mapNftAttributes } from '$lib/utils/nft.utils';
import { getMediaStatusOrCache } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { notEmptyString } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

const mapExtCollection = ({ canisterId, ...rest }: ExtToken): NftCollection => ({
	...rest,
	address: canisterId
});

export const mapExtNft = async ({
	index,
	token,
	identity
}: {
	index: TokenIndex;
	token: ExtToken;
	identity: Identity;
}): Promise<Nft> => {
	const { canisterId } = token;

	const identifier = extIndexToIdentifier({ collectionId: Principal.fromText(canisterId), index });

	const defaultImageUrl = `https://${canisterId}.raw.icp0.io/?tokenid=${identifier}`;

	const {
		imageUrl: fetchedImageUrl,
		thumbnailUrl: fetchedThumbnailUrl,
		...rest
	} = (await getExtMetadata({
		canisterId,
		tokenIdentifier: identifier,
		identity
	})) ?? {};

	const imageUrl = fetchedImageUrl ?? defaultImageUrl;
	const thumbnailUrl = fetchedThumbnailUrl ?? `${defaultImageUrl}&type=thumbnail`;

	const mediaStatus = {
		image: await getMediaStatusOrCache(imageUrl),
		thumbnail: await getMediaStatusOrCache(thumbnailUrl)
	};

	return {
		...rest,
		id: parseNftId(identifier),
		oisyId: parseNftId(parseExtTokenIndex(index).toString()),
		imageUrl,
		thumbnailUrl,
		mediaStatus,
		collection: mapExtCollection(token)
	};
};

const mapDip721Collection = ({ canisterId, ...rest }: Dip721Token): NftCollection => ({
	...rest,
	address: canisterId
});

// TODO: Fetch metadata of the NFT
export const mapDip721Nft = ({ index, token }: { index: bigint; token: Dip721Token }): Nft => {
	const mediaStatus = {
		image: NftMediaStatusEnum.INVALID_DATA,
		thumbnail: NftMediaStatusEnum.INVALID_DATA
	};

	return {
		id: parseNftId(index.toString()),
		mediaStatus,
		collection: mapDip721Collection(token)
	};
};

const mapIcPunksCollection = ({ canisterId, ...rest }: IcPunksToken): NftCollection => ({
	...rest,
	address: canisterId
});

export const mapIcPunksNft = async ({
	index: tokenIdentifier,
	token,
	identity
}: {
	index: bigint;
	token: IcPunksToken;
	identity: Identity;
}): Promise<Nft> => {
	const { canisterId } = token;

	const {
		url: rawUrl,
		desc: description,
		name,
		properties: attributes
	} = await getIcPunksMetadata({
		canisterId,
		tokenIdentifier,
		identity
	});

	const imageUrl = `https://${canisterId}.raw.icp0.io${rawUrl}`;

	const mediaStatus = {
		image: await getMediaStatusOrCache(imageUrl),
		thumbnail: NftMediaStatusEnum.INVALID_DATA
	};

	return {
		id: parseNftId(tokenIdentifier.toString()),
		imageUrl,
		mediaStatus,
		name,
		...(notEmptyString(description) ? { description } : {}),
		attributes: mapNftAttributes(
			attributes.map(({ name: trait_type, value }) => ({ trait_type, value }))
		),
		collection: mapIcPunksCollection(token)
	};
};
