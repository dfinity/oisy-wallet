import type { SwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import type { OptionAmount } from '$lib/types/send';
import type { SwapMappedResult, SwapProvider, SwapQuoteError } from '$lib/types/swap';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { get, readable, writable, type Readable } from 'svelte/store';

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

export const initSwapAmountsStore = ({
	amountSetToMax = readable(false)
}: {
	amountSetToMax?: Readable<boolean>;
} = {}): SwapAmountsStore => {
	const store = writable<Nullish<SwapAmountsStoreData>>(undefined);
	const { subscribe, set, update } = store;

	let manualProviderKey: SwapProvider | undefined;
	// Max applies its amount again whenever the provider-dependent fee changes, so a pick made
	// while Max is on follows those amounts. A pick made before Max went on does not: the first
	// Max press is a new amount the user asked for, like a typed one.
	let manualPickAtMax = false;

	return {
		subscribe,

		reset: () => {
			manualProviderKey = undefined;

			set(null);
		},

		setSwaps: ({ swaps, amountForSwap, slippageForSwap, selectedProvider, quoteError }) => {
			if (nonNullish(manualProviderKey)) {
				// A pick belongs to the amount of the quote it was made on, which the store still
				// holds: refreshes, a return from Review and Max applying its amount again keep it, a
				// round at another amount goes back to the top offer, and a new pair resets the store.
				const sameAmount = Number(amountForSwap) === Number(get(store)?.amountForSwap);
				const maxAppliedAgain = manualPickAtMax && get(amountSetToMax);
				const manualMatch =
					sameAmount || maxAppliedAgain
						? swaps.find((s) => s.provider === manualProviderKey)
						: undefined;

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
			manualPickAtMax = get(amountSetToMax);

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
