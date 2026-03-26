import { initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SwapProvider } from '$lib/types/swap';
import {
	mockNearIntentsProvider,
	mockSwapProviders,
	mockVeloraMarketProvider
} from '$tests/mocks/swap.mocks';
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

	describe('manual provider selection', () => {
		const evmSwaps = [mockVeloraMarketProvider, mockNearIntentsProvider];

		it('should persist manually selected provider across setSwaps refreshes', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);

			const updatedSwaps = [
				{ ...mockVeloraMarketProvider, receiveAmount: 950000000n },
				{ ...mockNearIntentsProvider, receiveAmount: 880000000n }
			];

			store.setSwaps({
				swaps: updatedSwaps,
				amountForSwap: '1000000',
				selectedProvider: updatedSwaps[0]
			});

			const state = get(store);
			expect(state?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
			expect(state?.manuallySelectedProviderKey).toBe(SwapProvider.NEAR_INTENTS);
		});

		it('should update the quote data of manually selected provider on refresh', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			const updatedNearIntents = { ...mockNearIntentsProvider, receiveAmount: 999000000n };
			const updatedSwaps = [updatedNearIntents, mockVeloraMarketProvider];

			store.setSwaps({
				swaps: updatedSwaps,
				amountForSwap: '1000000',
				selectedProvider: updatedSwaps[0]
			});

			expect(get(store)?.selectedProvider?.receiveAmount).toBe(999000000n);
		});

		it('should fall back to best rate if manually selected provider disappears', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			const swapsWithoutNearIntents = [mockVeloraMarketProvider];
			store.setSwaps({
				swaps: swapsWithoutNearIntents,
				amountForSwap: '1000000',
				selectedProvider: swapsWithoutNearIntents[0]
			});

			const state = get(store);
			expect(state?.selectedProvider?.provider).toBe(SwapProvider.VELORA);
			expect(state?.manuallySelectedProviderKey).toBeUndefined();
		});

		it('should clear manual selection on reset', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);
			store.reset();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '2000000',
				selectedProvider: evmSwaps[0]
			});

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.VELORA);
		});

		it('should set manuallySelectedProviderKey when using setManualProvider', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			const state = get(store);
			expect(state?.manuallySelectedProviderKey).toBe(SwapProvider.NEAR_INTENTS);
			expect(state?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
		});

		it('should not set manuallySelectedProviderKey when using setSelectedProvider', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setSelectedProvider(evmSwaps[1]);

			const state = get(store);
			expect(state?.manuallySelectedProviderKey).toBeUndefined();
			expect(state?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
		});
	});
});
