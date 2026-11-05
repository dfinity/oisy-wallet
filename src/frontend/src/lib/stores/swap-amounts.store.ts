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
		// Max set the round's amount. Max applies it again whenever the provider-dependent fee
		// changes, so a pick made at Max holds through those rounds.
		amountSetToMax?: boolean;
	}) => void;
	reset: () => void;
	setSelectedProvider: (provider: SwapMappedResult | undefined) => void;
	setManualProvider: (provider: SwapMappedResult) => void;
}

export const initSwapAmountsStore = (): SwapAmountsStore => {
	const store = writable<Nullish<SwapAmountsStoreData>>(undefined);
	const { subscribe, set, update } = store;

	let manualProviderKey: SwapProvider | undefined;
	let lastAmountSetToMax = false;

	return {
		subscribe,

		reset: () => {
			manualProviderKey = undefined;
			lastAmountSetToMax = false;

			set(null);
		},

		setSwaps: ({ swaps, amountForSwap, selectedProvider, quoteError, amountSetToMax = false }) => {
			// Only a Max round after another Max round is Max applying its amount again. The first
			// Max press is a new amount the user asked for, like a typed one.
			const maxAppliedAgain = amountSetToMax && lastAmountSetToMax;
			lastAmountSetToMax = amountSetToMax;

			if (nonNullish(manualProviderKey)) {
				// A pick belongs to the amount of the quote it was made on, which the store still
				// holds: refreshes, a return from Review and Max applying its amount again keep it, a
				// round at another amount goes back to the top offer, and a new pair resets the store.
				const sameAmount = Number(amountForSwap) === Number(get(store)?.amountForSwap);
				const manualMatch =
					sameAmount || maxAppliedAgain
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
