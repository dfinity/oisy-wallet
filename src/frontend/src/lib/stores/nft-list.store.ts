import { writable, type Writable } from 'svelte/store';

export interface NftListSortingType {
	order: 'asc' | 'desc';
	type: 'collection-name' | 'date';
}

interface NftListStoreData {
	sort: NftListSortingType;
	groupByCollection: boolean;
}

export interface NftListStore extends Writable<NftListStoreData> {
	setSort: (sort: NftListSortingType) => void;
	setGroupByCollection: (group: boolean) => void;
}

const initNftListStore = (): NftListStore => {
	const store = writable<NftListStoreData>({
		sort: {
			order: 'asc',
			type: 'collection-name'
		},
		groupByCollection: true
	});

	const setSort = (sort: NftListSortingType) => store.update((prev) => ({ ...prev, sort }));

	const setGroupByCollection = (group: boolean) =>
		store.update((prev) => ({ ...prev, groupByCollection: group }));

	return {
		...store,
		setSort,
		setGroupByCollection
	};
};

export const nftListStore = initNftListStore();
