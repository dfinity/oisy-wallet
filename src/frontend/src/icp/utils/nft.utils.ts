import type { TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import type { ExtToken } from '$icp/types/ext-token';
import { extIndexToIdentifier, parseExtTokenIndex, parseExtTokenName } from '$icp/utils/ext.utils';
import type { Nft, NftCollection } from '$lib/types/nft';
import { getMediaStatusOrCache } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { Principal } from '@icp-sdk/core/principal';

const mapExtCollection = ({ canisterId, ...rest }: ExtToken): NftCollection => ({
	...rest,
	address: canisterId
});

export const mapExtNft = async ({
	index,
	token
}: {
	index: TokenIndex;
	token: ExtToken;
}): Promise<Nft> => {
	const { canisterId } = token;

	const identifier = extIndexToIdentifier({ collectionId: Principal.fromText(canisterId), index });

	const imageUrl = `https://${canisterId}.raw.icp0.io/?index=${index}`;
	const thumbnailUrl = `${imageUrl}&type=thumbnail`;

	const mediaStatus = await getMediaStatusOrCache(imageUrl);

	return {
		id: parseNftId(identifier),
		oisyId: parseNftId(parseExtTokenIndex(index).toString()),
		name: parseExtTokenName({ index, token }),
		imageUrl,
		thumbnailUrl,
		mediaStatus,
		collection: mapExtCollection(token)
	};
};
