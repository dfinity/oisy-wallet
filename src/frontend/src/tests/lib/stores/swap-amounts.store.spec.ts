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

	describe('auto-selection without manual pick', () => {
		const evmSwaps = [mockVeloraMarketProvider, mockNearIntentsProvider];

		it('should auto-select best rate on every refresh', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.VELORA);

			const flippedSwaps = [
				{ ...mockNearIntentsProvider, receiveAmount: 999000000n },
				{ ...mockVeloraMarketProvider, receiveAmount: 800000000n }
			];

			store.setSwaps({
				swaps: flippedSwaps,
				amountForSwap: '1000000',
				selectedProvider: flippedSwaps[0]
			});

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
		});

		it('should keep following best rate across multiple refreshes', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.VELORA);

			const round2 = [
				{ ...mockNearIntentsProvider, receiveAmount: 950000000n },
				{ ...mockVeloraMarketProvider, receiveAmount: 800000000n }
			];
			store.setSwaps({
				swaps: round2,
				amountForSwap: '1000000',
				selectedProvider: round2[0]
			});

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);

			const round3 = [
				{ ...mockVeloraMarketProvider, receiveAmount: 1100000000n },
				{ ...mockNearIntentsProvider, receiveAmount: 900000000n }
			];
			store.setSwaps({
				swaps: round3,
				amountForSwap: '1000000',
				selectedProvider: round3[0]
			});

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.VELORA);
		});
	});

	describe('manual provider selection', () => {
		const evmSwaps = [mockVeloraMarketProvider, mockNearIntentsProvider];

		it('should keep selection when selected provider rate worsens', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			const updatedSwaps = [
				{ ...mockVeloraMarketProvider, receiveAmount: 950000000n },
				{ ...mockNearIntentsProvider, receiveAmount: 500000000n }
			];

			store.setSwaps({
				swaps: updatedSwaps,
				amountForSwap: '1000000',
				selectedProvider: updatedSwaps[0]
			});

			const state = get(store);

			expect(state?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
			expect(state?.selectedProvider?.receiveAmount).toBe(500000000n);
			expect(state?.swaps[0].provider).toBe(SwapProvider.VELORA);
		});

		it('should keep selection when selected provider rate improves', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			const updatedSwaps = [
				{ ...mockNearIntentsProvider, receiveAmount: 999000000n },
				{ ...mockVeloraMarketProvider, receiveAmount: 900000000n }
			];

			store.setSwaps({
				swaps: updatedSwaps,
				amountForSwap: '1000000',
				selectedProvider: updatedSwaps[0]
			});

			const state = get(store);

			expect(state?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
			expect(state?.selectedProvider?.receiveAmount).toBe(999000000n);
		});

		it('should keep selection when other provider becomes best rate', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			const updatedSwaps = [
				{ ...mockVeloraMarketProvider, receiveAmount: 1500000000n },
				{ ...mockNearIntentsProvider, receiveAmount: 890000000n }
			];

			store.setSwaps({
				swaps: updatedSwaps,
				amountForSwap: '1000000',
				selectedProvider: updatedSwaps[0]
			});

			const state = get(store);

			expect(state?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
			expect(state?.swaps[0].provider).toBe(SwapProvider.VELORA);
			expect(state?.swaps[0].receiveAmount).toBe(1500000000n);
		});

		it('should keep selection when other provider rate worsens', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			const updatedSwaps = [
				{ ...mockVeloraMarketProvider, receiveAmount: 400000000n },
				{ ...mockNearIntentsProvider, receiveAmount: 890000000n }
			];

			store.setSwaps({
				swaps: updatedSwaps,
				amountForSwap: '1000000',
				selectedProvider: updatedSwaps[0]
			});

			const state = get(store);

			expect(state?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
		});

		it('should keep selection when selected provider regains best rate', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			const round1 = [
				{ ...mockVeloraMarketProvider, receiveAmount: 1500000000n },
				{ ...mockNearIntentsProvider, receiveAmount: 890000000n }
			];
			store.setSwaps({
				swaps: round1,
				amountForSwap: '1000000',
				selectedProvider: round1[0]
			});

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
			expect(get(store)?.swaps[0].provider).toBe(SwapProvider.VELORA);

			const round2 = [
				{ ...mockNearIntentsProvider, receiveAmount: 2000000000n },
				{ ...mockVeloraMarketProvider, receiveAmount: 900000000n }
			];
			store.setSwaps({
				swaps: round2,
				amountForSwap: '1000000',
				selectedProvider: round2[0]
			});

			const state = get(store);

			expect(state?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
			expect(state?.swaps[0].provider).toBe(SwapProvider.NEAR_INTENTS);
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

		it('should resume auto-selection after manual provider disappears', () => {
			const store = initSwapAmountsStore();

			store.setSwaps({
				swaps: evmSwaps,
				amountForSwap: '1000000',
				selectedProvider: evmSwaps[0]
			});

			store.setManualProvider(evmSwaps[1]);

			store.setSwaps({
				swaps: [mockVeloraMarketProvider],
				amountForSwap: '1000000',
				selectedProvider: mockVeloraMarketProvider
			});

			expect(get(store)?.manuallySelectedProviderKey).toBeUndefined();

			const newSwaps = [
				{ ...mockNearIntentsProvider, receiveAmount: 2000000000n },
				{ ...mockVeloraMarketProvider, receiveAmount: 900000000n }
			];
			store.setSwaps({
				swaps: newSwaps,
				amountForSwap: '1000000',
				selectedProvider: newSwaps[0]
			});

			expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.NEAR_INTENTS);
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
