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
import { SvelteMap } from 'svelte/reactivity';

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

// Caches the on-chain image URL resolved per (network, contract, token id) so
// the NFT polling loop reuses it instead of re-resolving — and re-reporting —
// the same media on every refresh. A `null` entry records a token that resolved
// to no media (so we don't re-report that either). Transient failures are not
// cached, so they keep retrying on the next poll. Exposed so tests can reset it.
export const onChainImageUrlCache = new SvelteMap<string, string | null>();

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

	const withImageUrl = async (imageUrl: string): Promise<Nft> => ({
		...nft,
		imageUrl,
		mediaStatus: { ...nft.mediaStatus, image: await getMediaStatusOrCache(imageUrl) }
	});

	const cacheKey = `${networkId.toString()}#${nft.collection.address}#${nft.id}`;

	if (onChainImageUrlCache.has(cacheKey)) {
		const cached = onChainImageUrlCache.get(cacheKey);
		return nonNullish(cached) ? await withImageUrl(cached) : nft;
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
				...(nonNullish(nft.collection.symbol) && { token_symbol: nft.collection.symbol }),
				...(nonNullish(nft.collection.name) && { token_name: nft.collection.name }),
				token_id: `${nft.id}`
			}
		});

	try {
		const imageUrl = await loadOnChainImageUrl({ networkId, nft });

		// Cache the resolved outcome (the URL, or `null` for "no media on chain")
		// so later polls reuse it without re-resolving or re-reporting.
		onChainImageUrlCache.set(cacheKey, imageUrl ?? null);

		// `success` means we recovered an image URL; `error` means the contract
		// metadata exposed no usable image.
		trackLoad(
			nonNullish(imageUrl)
				? PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
		);

		return nonNullish(imageUrl) ? await withImageUrl(imageUrl) : nft;
	} catch (err: unknown) {
		// Not cached: a transient failure should be retried on the next poll.
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
