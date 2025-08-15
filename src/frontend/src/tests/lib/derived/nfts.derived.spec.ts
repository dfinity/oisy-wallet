import {
	nftListGroupByCollection,
	nftListSortOrder,
	nftListSortType
} from '$lib/derived/nfts.derived';
import { nftListStore } from '$lib/stores/nft-list.store';
import { get } from 'svelte/store';

describe('nfts.derived', () => {
	beforeEach(() => {
		// Reset store before each test
		nftListStore.set({
			sort: { order: 'asc', type: 'collection-name' },
			groupByCollection: true
		});
	});

	describe('nftListSortType', () => {
		it('should reflect the sort type from the main store', () => {
			expect(get(nftListSortType)).toBe('collection-name');

			nftListStore.set({
				sort: { order: 'asc', type: 'date' },
				groupByCollection: true
			});

			expect(get(nftListSortType)).toBe('date');
		});
	});

	describe('nftListSortOrder', () => {
		it('should reflect the sort order from the main store', () => {
			expect(get(nftListSortOrder)).toBe('asc');

			nftListStore.set({
				sort: { order: 'desc', type: 'collection-name' },
				groupByCollection: true
			});

			expect(get(nftListSortOrder)).toBe('desc');
		});
	});

	describe('nftListGroupByCollection', () => {
		it('should reflect groupByCollection from the main store', () => {
			expect(get(nftListGroupByCollection)).toBeTruthy();

			nftListStore.set({
				sort: { order: 'asc', type: 'collection-name' },
				groupByCollection: false
			});

			expect(get(nftListGroupByCollection)).toBeFalsy();
		});
	});
});
