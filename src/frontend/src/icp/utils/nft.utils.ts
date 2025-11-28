import type { TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import type { ExtToken } from '$icp/types/ext-token';
import type { Nft, NftCollection } from '$lib/types/nft';
import { getMediaStatusOrCache } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';

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

	const imageUrl = `https://${canisterId}.raw.icp0.io/?index=${index}`;

	const mediaStatus = await getMediaStatusOrCache(imageUrl);

	return {
		id: parseNftId(index.toString()),
		imageUrl,
		mediaStatus,
		collection: mapExtCollection(token)
	};
};
