import { routeCollection, routeNft, routeNftNetwork } from '$lib/derived/nav.derived';
import { nftStore } from '$lib/stores/nft.store';
import type { Nft } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const pageCollectionNfts: Readable<Nft[]> = derived(
	[nftStore, routeCollection, routeNftNetwork],
	([$nftStore, $routeCollection, $routeNftNetwork]) => {
		if (isNullish($nftStore)) {
			return [];
		}

		return $nftStore.filter(
			({
				collection: {
					address,
					network: { name: networkName }
				}
				// TODO: Confirm that `$routeNftNetwork` is the network name (not the ID) when comparing to `networkName` here.
			}) => address === $routeCollection && networkName === $routeNftNetwork
		);
	}
);

export const pageNft: Readable<Nft | undefined> = derived(
	[pageCollectionNfts, routeNft],
	([$pageCollectionNfts, $routeNft]) => {
		if (isNullish($pageCollectionNfts) || $pageCollectionNfts.length === 0) {
			return;
		}

		const routeNftId = Number($routeNft);

		if (isNaN(routeNftId)) {
			return;
		}

		return $pageCollectionNfts.find(({ id }) => id === parseNftId(routeNftId));
	}
);
