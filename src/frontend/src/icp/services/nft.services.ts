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

	const nftPromises = tokens.map(async (token) => {
		const { canisterId } = token;

		try {
			const tokenIndices = await getTokensByOwner({
				identity,
				owner,
				canisterId
			});

			const promises = tokenIndices.map(async (index) => await mapExtNft({ index, token }));

			return await Promise.all(promises);
		} catch (error: unknown) {
			console.warn(`Error loading EXT tokens from collection ${canisterId}:`, error);

			return [];
		}
	});

	return (await Promise.all(nftPromises)).flat();
};
