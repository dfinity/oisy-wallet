import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { Nft } from '$lib/types/nft';

export const getLoadedNftsByTokens = ({tokens, loadedNfts}:{ tokens: Erc721CustomToken[], loadedNfts: Nft[] }) => {
	const nftsByToken = new Map<string, Nft[]>();

	tokens.forEach(token => nftsByToken.set(token.address.toLowerCase(), []));

	loadedNfts.forEach(nft => {
		const contractAddress = nft.contract.address.toLowerCase();
		if (nftsByToken.has(contractAddress)) {
			const existingNfts = nftsByToken.get(contractAddress) ?? [];
			nftsByToken.set(contractAddress, [...existingNfts, nft]);
		}
	});

	return nftsByToken;
}