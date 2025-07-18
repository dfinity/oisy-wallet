import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { Nft, NftsByNetwork } from '$lib/types/nft';
import { isNullish, nonNullish } from '@dfinity/utils';

export const getNftsByNetworks = ({
	tokens,
	nfts
}: {
	tokens: Erc721CustomToken[];
	nfts: Nft[];
}): NftsByNetwork => {
	const nftsByToken: NftsByNetwork = {};

	tokens.forEach(({ address, network: { id: networkId } }) => {
		if (isNullish(nftsByToken[networkId])) {
			nftsByToken[networkId] = {};
		}
		nftsByToken[networkId][address.toLowerCase()] = [];
	});

	nfts.forEach((nft) => {
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
