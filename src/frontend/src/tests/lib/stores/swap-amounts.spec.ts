import { initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import type { OptionAmount } from '$lib/types/send';
import { MOCK_SWAP_PROVIDERS } from '$tests/mocks/swap.mocks';
import { get } from 'svelte/store';

const mockAmount: OptionAmount = '100';

describe('swapAmountsStore', () => {
	const mockSwaps = MOCK_SWAP_PROVIDERS;

	it('should initialize with undefined', () => {
		const store = initSwapAmountsStore();

		expect(get(store)).toBeUndefined();
	});

	it('should set swaps with amount and selected provider', () => {
		const store = initSwapAmountsStore();
		store.setSwaps({
			swaps: mockSwaps,
			amountForSwap: mockAmount,
			selectedProvider: mockSwaps[0]
		});

		expect(get(store)).toEqual({
			swaps: mockSwaps,
			amountForSwap: mockAmount,
			selectedProvider: mockSwaps[0]
		});
	});

	it('should reset store to null', () => {
		const store = initSwapAmountsStore();
		store.setSwaps({
			swaps: mockSwaps,
			amountForSwap: mockAmount,
			selectedProvider: mockSwaps[0]
		});
		store.reset();

		expect(get(store)).toBeNull();
	});

	it('should update selected provider', () => {
		const store = initSwapAmountsStore();
		store.setSwaps({
			swaps: mockSwaps,
			amountForSwap: mockAmount,
			selectedProvider: mockSwaps[0]
		});
		store.setSelectedProvider(mockSwaps[1]);

		expect(get(store)?.selectedProvider).toEqual(mockSwaps[1]);
	});

	it('should do nothing when setSelectedProvider is called and store is null', () => {
		const store = initSwapAmountsStore();
		store.setSelectedProvider(mockSwaps[0]);

		expect(get(store)).toBeUndefined();
	});
});
