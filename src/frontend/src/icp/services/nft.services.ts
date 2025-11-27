import { getTokensByOwner } from '$icp/api/ext-v2-token.api';
import type { IcNonFungibleToken } from '$icp/types/nft';
import { mapExtNft } from '$icp/utils/nft.utils';
import type { OptionIdentity } from '$lib/types/identity';
import type { Nft } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';

export const loadNfts = async ({
	tokens,
	identity
}: {
	tokens: IcNonFungibleToken[];
	identity: OptionIdentity;
}): Promise<Nft[]> => {
	if (isNullish(identity)) {
		return [];
	}

	const owner = identity.getPrincipal();

	return await tokens.reduce<Promise<Nft[]>>(async (acc, token) => {
		const { canisterId } = token;

		try {
			const tokenIndices = await getTokensByOwner({
				identity,
				owner,
				canisterId
			});

			const nfts = tokenIndices.map((index) => mapExtNft({ index, token }));

			return nfts.length > 0 ? [...(await acc), ...nfts] : await acc;
		} catch (error: unknown) {
			console.warn(`Error loading EXT tokens from collection ${canisterId}:`, error);

			return await acc;
		}
	}, Promise.resolve([]));
};
