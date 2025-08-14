import { writable } from 'svelte/store';

export interface NftListSortingType {
	order: 'asc' | 'desc';
	type: 'collection-name' | 'date';
}

interface NftListStoreData {
	sort: NftListSortingType;
	groupByCollection: boolean;
}

export const nftListStore = writable<NftListStoreData>({
	sort: {
		order: 'asc',
		type: 'collection-name'
	},
	groupByCollection: true
});
