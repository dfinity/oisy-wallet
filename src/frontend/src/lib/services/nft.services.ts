import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import { getTokensByNetwork } from '$lib/utils/nft.utils';
import { findNftsByNetwork } from '$lib/utils/nfts.utils';
import { isNullish } from '@dfinity/utils';

export const loadNfts = async ({
	tokens,
	loadedNfts,
	walletAddress
}: {
	tokens: NonFungibleToken[];
	loadedNfts: Nft[];
	walletAddress: OptionEthAddress;
}) => {
	const tokensByNetwork = getTokensByNetwork(tokens);

	for (const [networkId, tokens] of tokensByNetwork) {
		const nftsByNetwork = findNftsByNetwork({ nfts: loadedNfts, networkId });
		if (!(nftsByNetwork.length > 0)) {
			const nfts: Nft[] = await loadNftsByNetwork({ networkId, tokens, walletAddress });
			nftStore.addAll(nfts);
		}
	}
};

export const loadNftsByNetwork = async ({
	networkId,
	tokens,
	walletAddress
}: {
	networkId: NetworkId;
	tokens: NonFungibleToken[];
	walletAddress: OptionEthAddress;
}): Promise<Nft[]> => {
	if (isNullish(walletAddress)) {
		return [];
	}

	const { getNftsByOwner } = alchemyProviders(networkId);

	const batches = createBatches({ tokens, batchSize: 40 });

	const nfts: Nft[] = [];
	for (const batch of batches) {
		try {
			nfts.push(...(await getNftsByOwner({ address: walletAddress, tokens: batch })));
		} catch (_: unknown) {
			const tokenAddresses = batch.map((token) => token.address);
			console.warn(
				`Failed to load NFTs for tokens: ${tokenAddresses} on network: ${networkId.toString()}.`
			);
		}
	}

	return nfts;
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
