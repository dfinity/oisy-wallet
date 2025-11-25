import { getTokensByOwner } from '$icp/api/ext-v2-token.api';
import { isTokenExtV2 } from '$icp/utils/ext.utils';
import { mapExtNft } from '$icp/utils/nft.utils';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';

export const loadNfts = async ({
	networkId,
	tokens,
	identity
}: {
	networkId: NetworkId;
	tokens: NonFungibleToken[];
	identity: OptionIdentity;
}): Promise<Nft[]> => {
	if (isNullish(identity)) {
		return [];
	}

	const owner = identity.getPrincipal();

	const nfts = await tokens.reduce<Promise<Nft[]>>(async (acc, token) => {
		if (!isTokenExtV2(token)) {
			return await acc;
		}

		const { canisterId } = token;

		try {
			const tokenIndices = await getTokensByOwner({
				identity,
				owner,
				canisterId
			});

			const nfts = tokenIndices.map((index) => {
				return mapExtNft({ index, collection: token });
			});

			return nfts.length > 0 ? [...(await acc), ...nfts] : await acc;
		} catch (error: unknown) {
			console.warn(`Error loading EXT tokens from collection ${canisterId}:`, error);

			return await acc;
		}
	}, Promise.resolve([]));

	return nfts;
};
