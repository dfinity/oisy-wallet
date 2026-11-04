import type { SwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import type { OptionAmount } from '$lib/types/send';
import type { SwapMappedResult, SwapProvider, SwapQuoteError } from '$lib/types/swap';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { get, writable, type Readable } from 'svelte/store';

export interface SwapAmountsStoreData {
	swaps: SwapMappedResult[];
	amountForSwap: OptionAmount;
	selectedProvider?: SwapMappedResult;
	manuallySelectedProviderKey?: SwapProvider;
	// The reason the quote round produced no offers, when a provider named one.
	quoteError?: SwapQuoteError;
}

export interface SwapAmountsStore extends Readable<Nullish<SwapAmountsStoreData>> {
	setSwaps: (params: {
		swaps: SwapMappedResult[];
		amountForSwap: OptionAmount;
		selectedProvider?: SwapMappedResult;
		quoteError?: SwapQuoteError;
	}) => void;
	reset: () => void;
	setSelectedProvider: (provider: SwapMappedResult | undefined) => void;
	setManualProvider: (provider: SwapMappedResult) => void;
}

export const initSwapAmountsStore = (): SwapAmountsStore => {
	const store = writable<Nullish<SwapAmountsStoreData>>(undefined);
	const { subscribe, set, update } = store;

	let manualProviderKey: SwapProvider | undefined;
	// A pick is made for the quote at one amount, so a round at another amount goes back to the
	// top offer instead of carrying the pick over. Refreshes and a return from Review re-quote at
	// the same amount and keep it; a new pair resets the store.
	let manualAmount: OptionAmount;

	return {
		subscribe,

		reset: () => {
			manualProviderKey = undefined;
			manualAmount = undefined;

			set(null);
		},

		setSwaps: ({ swaps, amountForSwap, selectedProvider, quoteError }) => {
			if (nonNullish(manualProviderKey)) {
				const manualMatch =
					Number(amountForSwap) === Number(manualAmount)
						? swaps.find((s) => s.provider === manualProviderKey)
						: undefined;

				if (nonNullish(manualMatch)) {
					set({
						swaps,
						amountForSwap,
						selectedProvider: manualMatch,
						manuallySelectedProviderKey: manualProviderKey,
						quoteError
					});

					return;
				}

				manualProviderKey = undefined;
				manualAmount = undefined;
			}

			set({
				swaps,
				amountForSwap,
				selectedProvider,
				quoteError
			});
		},

		setSelectedProvider: (provider) => {
			update((data) => {
				if (isNullish(data)) {
					return data;
				}

				return { ...data, selectedProvider: provider };
			});
		},

		setManualProvider: (provider) => {
			manualProviderKey = provider.provider;
			manualAmount = get(store)?.amountForSwap;

			update((data) => {
				if (isNullish(data)) {
					return data;
				}

				return {
					...data,
					selectedProvider: provider,
					manuallySelectedProviderKey: provider.provider
				};
			});
		}
	};
};

export interface SwapAmountsContext {
	store: SwapAmountsStore;
	activity?: SwapQuoteActivityStore;
}

export const SWAP_AMOUNTS_CONTEXT_KEY = Symbol('swap-amounts');
