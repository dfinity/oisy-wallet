import { routeCollection, routeNetwork, routeNft, routeNftNetwork } from '$lib/derived/nav.derived';
import { nftStore } from '$lib/stores/nft.store';
import type { Nft } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const pageCollectionNfts: Readable<Nft[]> = derived(
	[nftStore, routeCollection, routeNftNetwork, routeNetwork],
	([$nftStore, $routeCollection, $routeNftNetwork, $routeNetwork]) => {
		if (isNullish($nftStore)) {
			return [];
		}

		return $nftStore.filter(
			({
				collection: {
					address,
					network: {
						name: networkName,
						id: { description: networkId }
					}
				}
				// TODO: Remove check by network name once routing refactoring has been completed
			}) =>
				address === $routeCollection &&
				(nonNullish($routeNftNetwork)
					? networkName === $routeNftNetwork
					: networkId === $routeNetwork)
		);
	}
);

export const pageNft: Readable<Nft | undefined> = derived(
	[pageCollectionNfts, routeNft],
	([$pageCollectionNfts, $routeNft]) => {
		if (isNullish($pageCollectionNfts) || $pageCollectionNfts.length === 0) {
			return;
		}

		const routeNftId = $routeNft;

		if (isNullish(routeNftId)) {
			return;
		}

		return $pageCollectionNfts.find(({ id }) => id === parseNftId(routeNftId));
	}
);
