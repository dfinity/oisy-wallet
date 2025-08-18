import { nftListStore, type NftListSortingType } from '$lib/stores/nft-list.store';
import { get } from 'svelte/store';

describe('nft-list.store', () => {
	it('has correct initial state', () => {
		expect(get(nftListStore)).toEqual({
			sort: { order: 'asc', type: 'collection-name' },
			groupByCollection: true
		});
	});

	it('setSort updates the sort property', () => {
		const newSort: NftListSortingType = { order: 'desc', type: 'date' };
		nftListStore.setSort(newSort);

		const value = get(nftListStore);

		expect(value.sort).toEqual(newSort);
		// groupByCollection should be unchanged
		expect(value.groupByCollection).toBeTruthy();
	});

	it('setGroupByCollection updates the groupByCollection property', () => {
		const valueBeforeUpdate = get(nftListStore);
		nftListStore.setGroupByCollection(false);

		const value = get(nftListStore);

		expect(value.groupByCollection).toBeFalsy();
		// sort should be unchanged
		expect(valueBeforeUpdate.sort).toEqual(value.sort);
	});
});
