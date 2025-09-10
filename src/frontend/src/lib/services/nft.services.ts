import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { createBatches } from '$lib/services/batch.services';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import { getTokensByNetwork } from '$lib/utils/nft.utils';
import { findNftsByToken } from '$lib/utils/nfts.utils';
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

	const promises = Array.from(tokensByNetwork).map(async ([networkId, tokens]) => {
		const tokensToLoad = tokens.filter((token) => {
			const nftsByToken = findNftsByToken({ nfts: loadedNfts, token });
			return nftsByToken.length === 0;
		});

		if (tokensToLoad.length > 0) {
			const nfts: Nft[] = await loadNftsByNetwork({
				networkId,
				tokens: tokensToLoad,
				walletAddress
			});
			nftStore.addAll(nfts);
		}
	});

	await Promise.allSettled(promises);
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

	const batches = createBatches<NonFungibleToken>({ items: tokens, batchSize: 40 });

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
