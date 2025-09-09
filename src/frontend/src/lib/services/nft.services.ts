import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { Nft, NftsByNetwork, NonFungibleToken } from '$lib/types/nft';
import { getNftsByNetworks } from '$lib/utils/nfts.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const loadNfts = async ({
	tokens,
	loadedNfts,
	walletAddress
}: {
	tokens: NonFungibleToken[];
	loadedNfts: Nft[];
	walletAddress: OptionEthAddress;
}) => {
	if (isNullish(walletAddress)) {
		return;
	}

	const loadedNftsByNetwork: NftsByNetwork = getNftsByNetworks({ tokens, nfts: loadedNfts });

	for (const token of tokens) {
		const nftsLoaded = hasLoadedNfts({ token, loadedNftsByNetwork });
		if (!nftsLoaded) {
			const { getNftsByOwner } = alchemyProviders(token.network.id);

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
	}
};

const hasLoadedNfts = ({
	token: {
		network: { id: networkId },
		address
	},
	loadedNftsByNetwork
}: {
	token: NonFungibleToken;
	loadedNftsByNetwork: NftsByNetwork;
}): boolean => {
	const tokensByNetwork = loadedNftsByNetwork[networkId];
	if (nonNullish(tokensByNetwork)) {
		const nfts = tokensByNetwork[address.toLowerCase()] ?? [];
		return nfts.length > 0;
	}

	return false;
};
