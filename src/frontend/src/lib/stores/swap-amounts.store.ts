import type { OptionAmount } from '$lib/types/send';
import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export interface SwapAmountsStoreData {
	swaps: SwapMappedResult[];
	amountForSwap: OptionAmount;
	selectedProvider?: SwapMappedResult;
	manuallySelectedProviderKey?: SwapProvider;
}

export interface SwapAmountsStore extends Readable<Nullish<SwapAmountsStoreData>> {
	setSwaps: (params: {
		swaps: SwapMappedResult[];
		amountForSwap: OptionAmount;
		selectedProvider?: SwapMappedResult;
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

		setSwaps: ({ swaps, amountForSwap, selectedProvider }) => {
			if (nonNullish(manualProviderKey)) {
				const manualMatch = swaps.find((s) => s.provider === manualProviderKey);

				if (nonNullish(manualMatch)) {
					set({
						swaps,
						amountForSwap,
						selectedProvider: manualMatch,
						manuallySelectedProviderKey: manualProviderKey
					});

					return;
				}

				manualProviderKey = undefined;
			}

			set({
				swaps,
				amountForSwap,
				selectedProvider
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
