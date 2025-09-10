import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';
import { createBatches } from '$lib/services/batch.services';

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
		const { getNftsByOwner } = alchemyProviders(token.network.id);

		let nfts: Nft[] = [];
		try {
			nfts = await getNftsByOwner({ address: walletAddress, tokens: [token] });
		} catch (_: unknown) {
			console.warn(
				`Failed to load NFTs for token: ${token.address} on network: ${token.network.id.toString()}.`
			);
			nfts = [];
		}

		nftStore.addAll(nfts);
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
