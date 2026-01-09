import { getTokensByOwner as getDip721TokensByOwner } from '$icp/api/dip721.api';
import { getTokensByOwner as getExtTokensByOwner } from '$icp/api/ext-v2-token.api';
import type { IcNonFungibleToken } from '$icp/types/nft';
import { isTokenDip721 } from '$icp/utils/dip721.utils';
import { isTokenExt } from '$icp/utils/ext.utils';
import { mapDip721Nft, mapExtNft } from '$icp/utils/nft.utils';
import { TRACK_COUNT_IC_LOADING_NFTS_FROM_COLLECTION_ERROR } from '$lib/constants/analytics.constants';
import { trackEvent } from '$lib/services/analytics.services';
import type { OptionIdentity } from '$lib/types/identity';
import type { Nft } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { mapIcErrorMetadata } from '$lib/utils/error.utils';
import { assertNever, isNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

const loadExtNfts = async ({
	token,
	identity
}: {
	token: IcNonFungibleToken;
	identity: Identity;
}) => {
	const {
		canisterId,
		standard: { code: standard }
	} = token;

	const owner = identity.getPrincipal();

	try {
		const tokenIndices = await getExtTokensByOwner({
			identity,
			owner,
			canisterId
		});

		const promises = tokenIndices.map(async (index) => await mapExtNft({ index, token, identity }));

		return await Promise.all(promises);
	} catch (err: unknown) {
		trackEvent({
			name: TRACK_COUNT_IC_LOADING_NFTS_FROM_COLLECTION_ERROR,
			metadata: { ...(mapIcErrorMetadata(err) ?? {}), canisterId, standard }
		});

		return [];
	}
};

const loadDip721Nfts = async ({
	token,
	identity
}: {
	token: IcNonFungibleToken;
	identity: Identity;
}) => {
	const {
		canisterId,
		standard: { code: standard }
	} = token;

	const owner = identity.getPrincipal();

	try {
		const tokenIndices = await getDip721TokensByOwner({
			identity,
			owner,
			canisterId
		});

		const promises = tokenIndices.map(async (index) => await mapDip721Nft({ index, token }));

		return await Promise.all(promises);
	} catch (err: unknown) {
		trackEvent({
			name: TRACK_COUNT_IC_LOADING_NFTS_FROM_COLLECTION_ERROR,
			metadata: { ...(mapIcErrorMetadata(err) ?? {}), canisterId, standard }
		});

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

	const nftPromises = tokens.map(async (token) => {
		if (isTokenExt(token)) {
			return await loadExtNfts({ token, identity });
		}

		if (isTokenDip721(token)) {
			return await loadDip721Nfts({ token, identity });
		}

		assertNever(token, `Unsupported NFT IC token ${(token as Token).standard.code}`);
	});

	return (await Promise.all(nftPromises)).flat();
};
