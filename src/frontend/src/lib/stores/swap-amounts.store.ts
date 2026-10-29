import type { OptionAmount } from '$lib/types/send';
import type { SwapMappedResult, SwapProvider, SwapQuoteError } from '$lib/types/swap';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export interface SwapAmountsStoreData {
	swaps: SwapMappedResult[];
	amountForSwap: OptionAmount;
	// The slippage the offers were requested with. A provider can sign a minimum derived from it
	// (NEAR Intents does), so an offer holds for this slippage only.
	slippageForSwap?: number;
	selectedProvider?: SwapMappedResult;
	manuallySelectedProviderKey?: SwapProvider;
	// The reason the quote round produced no offers, when a provider named one.
	quoteError?: SwapQuoteError;
}

export interface SwapAmountsStore extends Readable<Nullish<SwapAmountsStoreData>> {
	setSwaps: (params: {
		swaps: SwapMappedResult[];
		amountForSwap: OptionAmount;
		slippageForSwap?: number;
		selectedProvider?: SwapMappedResult;
		quoteError?: SwapQuoteError;
	}) => void;
	reset: () => void;
	setSelectedProvider: (provider: SwapMappedResult | undefined) => void;
	setManualProvider: (provider: SwapMappedResult) => void;
}

export const initSwapAmountsStore = (): SwapAmountsStore => {
	const { subscribe, set, update } = writable<Nullish<SwapAmountsStoreData>>(undefined);

	let manualProviderKey: SwapProvider | undefined;

	return {
		subscribe,

		reset: () => {
			manualProviderKey = undefined;

			set(null);
		},

		setSwaps: ({ swaps, amountForSwap, slippageForSwap, selectedProvider, quoteError }) => {
			if (nonNullish(manualProviderKey)) {
				const manualMatch = swaps.find((s) => s.provider === manualProviderKey);

				if (nonNullish(manualMatch)) {
					set({
						swaps,
						amountForSwap,
						slippageForSwap,
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
				slippageForSwap,
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
}

export const SWAP_AMOUNTS_CONTEXT_KEY = Symbol('swap-amounts');
