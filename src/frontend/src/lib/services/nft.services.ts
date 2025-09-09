import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';
import type { NetworkId } from '$lib/types/network';

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

	const tokensByNetwork = tokens.reduce((acc, token) => {
		const { network: { id: networkId } } = token;

		if (!acc.has(networkId)) {
			acc.set(networkId, []);
		}

		acc.set(networkId, [...acc.get(networkId), token]);

		return acc;
	}, new Map<NetworkId, NonFungibleToken[]>());

	for (const [networkId, tokens] of tokensByNetwork) {
		const existingNftsForNetwork = loadedNfts.filter((nft) => nft.collection.network.id === networkId);
		if (!(existingNftsForNetwork.length > 0)) {
			const { getNftsByOwner } = alchemyProviders(networkId);

			const batches = createBatches({tokens, batchSize: 40})

			for (const batch of batches) {
				let nfts: Nft[] = [];
				try {
					nfts = await getNftsByOwner({address: walletAddress, tokens: batch})
				} catch (_: unknown) {
					const tokenAddresses = batch.map((token) => token.address)
					console.warn(
						`Failed to load NFTs for tokens: ${tokenAddresses} on network: ${networkId.toString()}.`
					);
					nfts = [];
				}

				nftStore.addAll(nfts);
			}
		}
	}
};

const createBatches = ({
												 tokens,
												 batchSize
											 }: {
	tokens: NonFungibleToken[];
	batchSize: number;
}): NonFungibleToken[][] =>
	Array.from({ length: Math.ceil(tokens.length / batchSize) }, (_, index) =>
		tokens.slice(index * batchSize, (index + 1) * batchSize)
	);
