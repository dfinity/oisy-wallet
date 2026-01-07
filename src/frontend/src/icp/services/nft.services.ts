import { getTokensByOwner } from '$icp/api/ext-v2-token.api';
import type { IcNonFungibleToken } from '$icp/types/nft';
import { mapExtNft } from '$icp/utils/nft.utils';
import type { OptionIdentity } from '$lib/types/identity';
import type { Nft } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

const loadExtNfts = async ({
	token,
	identity
}: {
	token: IcNonFungibleToken;
	identity: Identity;
}) => {
	const { canisterId } = token;

	const owner = identity.getPrincipal();

	try {
		const tokenIndices = await getTokensByOwner({
			identity,
			owner,
			canisterId
		});

		const promises = tokenIndices.map(async (index) => await mapExtNft({ index, token, identity }));

		return await Promise.all(promises);
	} catch (error: unknown) {
		console.warn(`Error loading EXT tokens from collection ${canisterId}:`, error);

		return [];
	}
};

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

	const nftPromises = tokens.map(async (token) => await loadExtNfts({ token, identity }));

	return (await Promise.all(nftPromises)).flat();
};
