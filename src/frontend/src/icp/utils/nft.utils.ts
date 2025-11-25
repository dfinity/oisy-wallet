import type { TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import type { ExtToken } from '$icp/types/ext-token';
import type { Nft } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';

export const mapExtNft = ({
	index,
	collection
}: {
	index: TokenIndex;
	collection: ExtToken;
}): Nft => {
	const { canisterId: collectionId } = collection;

	const identifier = extIndexToIdentifier({ collectionId, index });

	return {
		id: parseNftId(identifier),
		imageUrl: `https://${collectionId}.raw.icp0.io/?index=${index}`,
		collection
	};
};
