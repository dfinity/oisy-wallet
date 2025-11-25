import { initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { get } from 'svelte/store';

describe('swap-amounts.store', () => {
	it('should initialize with nullish data', () => {
		const store = initSwapAmountsStore();

		expect(get(store)).toBeUndefined();
	});

	it('should set swaps without selected provider', () => {
		const store = initSwapAmountsStore();

		store.setSwaps({
			swaps: mockSwapProviders,
			amountForSwap: '1000000'
		});

		expect(get(store)).toEqual({
			swaps: mockSwapProviders,
			amountForSwap: '1000000'
		});
	});

	it('should set swaps with selected provider', () => {
		const store = initSwapAmountsStore();

		store.setSwaps({
			swaps: mockSwapProviders,
			amountForSwap: '1000000',
			selectedProvider: mockSwapProviders[0]
		});

		expect(get(store)).toEqual({
			swaps: mockSwapProviders,
			amountForSwap: '1000000',
			selectedProvider: mockSwapProviders[0]
		});
	});

	it('should not set provider if swaps array is empty', () => {
		const store = initSwapAmountsStore();
		store.setSelectedProvider(mockSwapProviders[0]);

		expect(get(store)?.selectedProvider).toBeUndefined();
	});

	it('should set provider if swaps array is not empty', () => {
		const store = initSwapAmountsStore();
		store.setSwaps({
			swaps: mockSwapProviders,
			amountForSwap: '1000000'
		});
		store.setSelectedProvider(mockSwapProviders[0]);

		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[0]);
	});
});
