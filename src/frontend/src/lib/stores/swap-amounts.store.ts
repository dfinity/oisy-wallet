import type { OptionAmount } from '$lib/types/send';
import type { SwapMappedResult } from '$lib/types/swap';
import type { Option } from '$lib/types/utils';
import { isNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export interface SwapAmountsStoreData {
	swaps: SwapMappedResult[];
	amountForSwap: OptionAmount;
	selectedProvider?: SwapMappedResult;
	customErrors?: string;
}

export interface SwapAmountsStore extends Readable<Option<SwapAmountsStoreData>> {
	setSwaps: (params: {
		swaps: SwapMappedResult[];
		amountForSwap: OptionAmount;
		selectedProvider?: SwapMappedResult;
		customErrors?: string;
	}) => void;
	reset: () => void;
	setSelectedProvider: (provider: SwapMappedResult | undefined) => void;
	setCustomErrors: (error: string) => void;
}

export const initSwapAmountsStore = (): SwapAmountsStore => {
	const { subscribe, set, update } = writable<Option<SwapAmountsStoreData>>(undefined);

	return {
		subscribe,

		reset: () => {
			set(null);
		},

		setSwaps: ({ swaps, amountForSwap, selectedProvider, customErrors }) => {
			set({
				swaps,
				amountForSwap,
				selectedProvider,
				customErrors
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

		setCustomErrors: (error) => {
			update((data) => {
				if (isNullish(data)) {
					return data;
				}
				return { ...data, customErrors: error };
			});
		}
	};
};

export interface SwapAmountsContext {
	store: SwapAmountsStore;
}

export const SWAP_AMOUNTS_CONTEXT_KEY = Symbol('swap-amounts');
