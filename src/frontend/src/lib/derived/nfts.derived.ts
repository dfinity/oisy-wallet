import { nftListStore, type NftListSortingType } from '$lib/stores/nft-list.store';
import { derived, type Readable } from 'svelte/store';

export const nftListSortType: Readable<NftListSortingType['type']> = derived(
	[nftListStore],
	([
		{
			sort: { type }
		}
	]) => type
);

export const nftListSortOrder: Readable<NftListSortingType['order']> = derived(
	[nftListStore],
	([
		{
			sort: { order }
		}
	]) => order
);

export const nftListGroupByCollection: Readable<boolean> = derived(
	[nftListStore],
	([{ groupByCollection }]) => groupByCollection
);
