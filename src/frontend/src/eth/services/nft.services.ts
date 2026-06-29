import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { infuraErc1155Providers } from '$eth/providers/infura-erc1155.providers';
import { infuraErc721Providers } from '$eth/providers/infura-erc721.providers';
import type { OptionEthAddress } from '$eth/types/address';
import type { EthNonFungibleToken } from '$eth/types/nft';
import { TRACK_NFT_LOAD_ONCHAIN_IMAGE_URL } from '$lib/constants/analytics.constants';
import { PLAUSIBLE_EVENT_CONTEXTS, PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { createBatches } from '$lib/services/batch.services';
import type { NetworkId } from '$lib/types/network';
import type { Nft } from '$lib/types/nft';
import { consoleWarn } from '$lib/utils/console.utils';
import { getMediaStatusOrCache } from '$lib/utils/nfts.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

// Alchemy is the source for owned NFTs, but it sometimes returns no media URL
// for a token it has not indexed yet, even when the collection's metadata (and
// image) are reachable on-chain. For those, fall back to resolving the image
// from the contract's tokenURI/uri so the asset still renders.
const loadOnChainImageUrl = async ({
	networkId,
	nft: {
		id: tokenId,
		collection: { address: contractAddress, standard }
	}
}: {
	networkId: NetworkId;
	nft: Nft;
}): Promise<string | undefined> => {
	const { getNftMetadata } =
		standard.code === 'erc1155'
			? infuraErc1155Providers(networkId)
			: infuraErc721Providers(networkId);

	const { imageUrl } = await getNftMetadata({ contractAddress, tokenId });

	return imageUrl;
};

const withOnChainMediaFallback = async ({
	networkId,
	nft
}: {
	networkId: NetworkId;
	nft: Nft;
}): Promise<Nft> => {
	if (nonNullish(nft.imageUrl)) {
		return nft;
	}

	const trackLoad = (resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES) =>
		trackEvent({
			name: TRACK_NFT_LOAD_ONCHAIN_IMAGE_URL,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				result_status: resultStatus,
				token_network: nft.collection.network.name,
				token_address: nft.collection.address,
				token_standard: nft.collection.standard.code,
				token_id: `${nft.id}`
			}
		});

	try {
		const imageUrl = await loadOnChainImageUrl({ networkId, nft });

		// `success` means we recovered an image URL; `error` covers both a load
		// that returned no image and one that threw (handled below).
		trackLoad(
			nonNullish(imageUrl)
				? PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
		);

		if (isNullish(imageUrl)) {
			return nft;
		}

		return {
			...nft,
			imageUrl,
			mediaStatus: { ...nft.mediaStatus, image: await getMediaStatusOrCache(imageUrl) }
		};
	} catch (err: unknown) {
		trackLoad(PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR);
		consoleWarn(
			`Failed to resolve on-chain media for NFT ${nft.id} of token: ${nft.collection.address} on network: ${networkId.toString()}.`,
			err
		);
		return nft;
	}
};

export const loadNftsByNetwork = async ({
	networkId,
	tokens,
	walletAddress
}: {
	networkId: NetworkId;
	tokens: EthNonFungibleToken[];
	walletAddress: OptionEthAddress;
}): Promise<Nft[]> => {
	if (isNullish(walletAddress)) {
		return [];
	}

	const { getNftsByOwner } = alchemyProviders(networkId);

	const batches = createBatches<EthNonFungibleToken>({ items: tokens, batchSize: 40 });

	const nfts: Nft[] = [];
	for (const batch of batches) {
		try {
			nfts.push(...(await getNftsByOwner({ address: walletAddress, tokens: batch })));
		} catch (err: unknown) {
			const tokenAddresses = batch.map((token) => token.address);
			consoleWarn(
				`Failed to load NFTs for tokens: ${tokenAddresses} on network: ${networkId.toString()}.`,
				err
			);
		}
	}

	// Resolve the on-chain media fallback in small batches rather than all at
	// once, to avoid bursting Infura when many owned NFTs lack Alchemy media.
	const fallbackBatches = createBatches<Nft>({ items: nfts, batchSize: 10 });

	const withFallback: Nft[] = [];
	for (const batch of fallbackBatches) {
		withFallback.push(
			...(await Promise.all(batch.map((nft) => withOnChainMediaFallback({ networkId, nft }))))
		);
	}

	return withFallback;
};
