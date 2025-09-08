import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { EthAddress, OptionEthAddress } from '$lib/types/address';
import type { Nft, NftId, NftMetadata, NonFungibleToken } from '$lib/types/nft';
import { isNullish, nonNullish } from '@dfinity/utils';

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
		const alchemyProvider = alchemyProviders(token.network.id);

		let nfts: Nft[] = [];
		try {
			nfts = await alchemyProvider.getNftsByOwner({ address: walletAddress, token });
		} catch (_: unknown) {
			nfts = []
		}

		nftStore.addAll(nfts);
	}
};