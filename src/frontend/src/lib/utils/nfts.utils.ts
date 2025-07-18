import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { Nft, NftsByNetwork } from '$lib/types/nft';
import { isNullish, nonNullish } from '@dfinity/utils';

export const getLoadedNftsByTokens = ({
	tokens,
	loadedNfts
}: {
	tokens: Erc721CustomToken[];
	loadedNfts: Nft[];
}): NftsByNetwork => {
	const nftsByToken: NftsByNetwork = {};

	tokens.forEach(({ address, network: { id } }) => {
		if (isNullish(nftsByToken[id])) {
			nftsByToken[id] = {};
		}
		nftsByToken[id][address.toLowerCase()] = [];
	});

	loadedNfts.forEach((nft) => {
		const {
			contract: {
				network: { id: networkId },
				address
			}
		} = nft;
		const normalizedAddress = address.toLowerCase();

		if (
			nonNullish(nftsByToken[networkId]) &&
			nonNullish(nftsByToken[networkId][normalizedAddress])
		) {
			nftsByToken[networkId][normalizedAddress].push(nft);
		}
	});

	return nftsByToken;
};
