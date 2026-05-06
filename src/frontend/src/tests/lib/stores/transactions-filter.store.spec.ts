import {
	TRANSACTIONS_FILTER_STORAGE_KEY,
	transactionsFilterStore
} from '$lib/stores/transactions-filter.store';
import { EMPTY_TRANSACTIONS_FILTER } from '$lib/types/transactions-filter';
import { get } from 'svelte/store';

describe('transactionsFilterStore', () => {
	beforeEach(() => {
		localStorage.clear();
		transactionsFilterStore.clear();
	});

	it('starts empty by default', () => {
		expect(get(transactionsFilterStore)).toEqual(EMPTY_TRANSACTIONS_FILTER);
	});

	describe('toggleType', () => {
		it('adds a type when not present', () => {
			transactionsFilterStore.toggleType('send');

			expect(get(transactionsFilterStore).types).toEqual(['send']);
		});

		it('removes a type when already present', () => {
			transactionsFilterStore.toggleType('send');
			transactionsFilterStore.toggleType('receive');
			transactionsFilterStore.toggleType('send');

			expect(get(transactionsFilterStore).types).toEqual(['receive']);
		});

		it('keeps other facets untouched', () => {
			transactionsFilterStore.toggleTokenId('ICP');
			transactionsFilterStore.toggleContactId('42');
			transactionsFilterStore.toggleType('send');

			const value = get(transactionsFilterStore);

			expect(value.tokenIds).toEqual(['ICP']);
			expect(value.contactIds).toEqual(['42']);
			expect(value.types).toEqual(['send']);
		});
	});

	describe('toggleTokenId', () => {
		it('toggles token ids', () => {
			transactionsFilterStore.toggleTokenId('ICP');
			transactionsFilterStore.toggleTokenId('ETH');

			expect(get(transactionsFilterStore).tokenIds).toEqual(['ICP', 'ETH']);

			transactionsFilterStore.toggleTokenId('ICP');

			expect(get(transactionsFilterStore).tokenIds).toEqual(['ETH']);
		});
	});

	describe('toggleContactId', () => {
		it('toggles contact ids', () => {
			transactionsFilterStore.toggleContactId('1');
			transactionsFilterStore.toggleContactId('2');

			expect(get(transactionsFilterStore).contactIds).toEqual(['1', '2']);

			transactionsFilterStore.toggleContactId('2');

			expect(get(transactionsFilterStore).contactIds).toEqual(['1']);
		});
	});

	describe('clear', () => {
		it('resets all facets to the empty filter', () => {
			transactionsFilterStore.toggleType('send');
			transactionsFilterStore.toggleTokenId('ICP');
			transactionsFilterStore.toggleContactId('1');

			transactionsFilterStore.clear();

			expect(get(transactionsFilterStore)).toEqual(EMPTY_TRANSACTIONS_FILTER);
		});

		it('removes the persisted entry from localStorage', () => {
			transactionsFilterStore.toggleType('send');

			expect(localStorage.getItem(TRANSACTIONS_FILTER_STORAGE_KEY)).not.toBeNull();

			transactionsFilterStore.clear();

			expect(localStorage.getItem(TRANSACTIONS_FILTER_STORAGE_KEY)).toBeNull();
		});
	});

	describe('persistence', () => {
		it('writes the JSON-serialised value to localStorage on toggle', () => {
			transactionsFilterStore.toggleType('send');
			transactionsFilterStore.toggleTokenId('ICP');
			transactionsFilterStore.toggleContactId('1');

			const raw = localStorage.getItem(TRANSACTIONS_FILTER_STORAGE_KEY);

			expect(raw).not.toBeNull();
			expect(JSON.parse(raw ?? '{}')).toEqual({
				types: ['send'],
				tokenIds: ['ICP'],
				contactIds: ['1']
			});
		});
	});
});
