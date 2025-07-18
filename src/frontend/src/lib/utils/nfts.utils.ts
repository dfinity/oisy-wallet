import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { NetworkId } from '$lib/types/network';
import type { Nft } from '$lib/types/nft';
import { isNullish, nonNullish } from '@dfinity/utils';

export type NftsByNetwork = Record<NetworkId, Record<string, Nft[]>>;

export const getLoadedNftsByTokens = ({
	tokens,
	loadedNfts
}: {
	tokens: Erc721CustomToken[];
	loadedNfts: Nft[];
}): NftsByNetwork => {
	const nftsByToken: NftsByNetwork = {};

	tokens.forEach((token) => {
		if (isNullish(nftsByToken[token.network.id])) {
			nftsByToken[token.network.id] = {};
		}
		nftsByToken[token.network.id][token.address.toLowerCase()] = [];
	});

	loadedNfts.forEach((nft) => {
		const networkId = nft.contract.network.id;
		const address = nft.contract.address.toLowerCase();

		if (nonNullish(nftsByToken[networkId]) && nonNullish(nftsByToken[networkId][address])) {
			nftsByToken[networkId][address].push(nft);
		}
	});

	return nftsByToken;
};
