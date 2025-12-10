import type { TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import { getExtMetadata } from '$icp/services/ext-metadata.services';
import type { ExtToken } from '$icp/types/ext-token';
import { extIndexToIdentifier, parseExtTokenIndex } from '$icp/utils/ext.utils';
import type { Nft, NftCollection } from '$lib/types/nft';
import { getMediaStatusOrCache } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
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

	const { imageUrl, thumbnailUrl, ...rest } = (await getExtMetadata({
		canisterId,
		tokenIdentifier: identifier,
		identity
	})) ?? {
		imageUrl: defaultImageUrl,
		thumbnailUrl: `${defaultImageUrl}&type=thumbnail`
	};

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
