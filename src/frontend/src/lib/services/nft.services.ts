import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';

export const loadNfts = async ({
	tokens,
	walletAddress
}: {
	tokens: NonFungibleToken[];
	walletAddress: OptionEthAddress;
}) => {
	if (isNullish(walletAddress)) {
		return;
	}

	for (const token of tokens) {
		const {getNftsByOwner} = alchemyProviders(token.network.id);

		let nfts: Nft[] = [];
		try {
			nfts = await getNftsByOwner({ address: walletAddress, token });
		} catch (_: unknown) {
			console.warn(
				`Failed to load NFTs for token: ${token.address} on network: ${token.network.id.toString()}.`
			);
			nfts = [];
		}

		nftStore.addAll(nfts);
	}
};
