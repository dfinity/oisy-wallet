import type { TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import type { ExtToken } from '$icp/types/ext-token';
import { extIndexToIdentifier } from '$icp/utils/ext.utils';
import type { Nft, NftCollection } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { Principal } from '@icp-sdk/core/principal';

const mapExtCollection = ({ canisterId, ...rest }: ExtToken): NftCollection => ({
	...rest,
	address: canisterId
});

export const mapExtNft = ({ index, token }: { index: TokenIndex; token: ExtToken }): Nft => {
	const { canisterId } = token;

	const identifier = extIndexToIdentifier({ collectionId: Principal.fromText(canisterId), index });

	return {
		id: parseNftId(identifier),
		imageUrl: `https://${canisterId}.raw.icp0.io/?index=${index}`,
		collection: mapExtCollection(token)
	};
};
