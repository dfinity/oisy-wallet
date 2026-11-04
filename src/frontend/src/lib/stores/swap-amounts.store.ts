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
		// The amount changed without the user entering it (Max applied again after a fee change),
		// so a manual pick still holds at the new amount.
		keepManualProvider?: boolean;
	}) => void;
	reset: () => void;
	setSelectedProvider: (provider: SwapMappedResult | undefined) => void;
	setManualProvider: (provider: SwapMappedResult) => void;
}

export const initSwapAmountsStore = (): SwapAmountsStore => {
	const store = writable<Nullish<SwapAmountsStoreData>>(undefined);
	const { subscribe, set, update } = store;

	let manualProviderKey: SwapProvider | undefined;

	return {
		subscribe,

		reset: () => {
			manualProviderKey = undefined;

			set(null);
		},

		setSwaps: ({
			swaps,
			amountForSwap,
			selectedProvider,
			quoteError,
			keepManualProvider = false
		}) => {
			if (nonNullish(manualProviderKey)) {
				// A pick belongs to the amount of the quote it was made on, which the store still
				// holds: refreshes and a return from Review re-quote that amount and keep it, a round
				// at another amount goes back to the top offer, and a new pair resets the store.
				const sameAmount = Number(amountForSwap) === Number(get(store)?.amountForSwap);
				const manualMatch =
					keepManualProvider || sameAmount
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
