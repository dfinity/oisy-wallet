import { routeCollection, routeNetwork, routeNft } from '$lib/derived/nav.derived';
import { nftStore } from '$lib/stores/nft.store';
import type { Nft } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const pageCollectionNfts: Readable<Nft[]> = derived(
	[nftStore, routeCollection, routeNetwork],
	([$nftStore, $routeCollection, $routeNftNetwork]) => {
		if (isNullish($nftStore)) {
			return [];
		}

		return $nftStore.filter(
			({
				collection: {
					address,
					network: {
						id: { description: networkId }
					}
				}
			}) => address === $routeCollection && networkId === $routeNftNetwork
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
