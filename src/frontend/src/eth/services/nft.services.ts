import { alchemyProviders } from '$eth/providers/alchemy.providers';
import type { OptionEthAddress } from '$eth/types/address';
import { createBatches } from '$lib/services/batch.services';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';

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

	const batches = createBatches<NonFungibleToken>({ items: tokens, batchSize: 40 });

	const nfts: Nft[] = [];
	for (const batch of batches) {
		try {
			nfts.push(...(await getNftsByOwner({ address: walletAddress, tokens: batch })));
		} catch (err: unknown) {
			const tokenAddresses = batch.map((token) => token.address);
			console.warn(
				`Failed to load NFTs for tokens: ${tokenAddresses} on network: ${networkId.toString()}.`,
				err
			);
		}
	}

	return nfts;
};
