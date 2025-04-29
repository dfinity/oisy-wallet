import type { OptionAmount } from '$lib/types/send';
import type { ProviderFee } from '$lib/types/swap';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type SwapProvider = 'kongSwap' | 'icpSwap';

export interface SwapProviderResult {
	provider: SwapProvider;
	receiveAmount: bigint;
	slippage?: number;
	route?: string[];
	liquidityFees?: ProviderFee[];
	networkFee?: ProviderFee;
	rawSwap: unknown;
}

export interface SwapAmountsStoreData {
	swaps: SwapProviderResult[];
	amountForSwap?: OptionAmount;
	selectedProvider?: SwapProvider;
}

export interface SwapAmountsStore extends Readable<Option<SwapAmountsStoreData>> {
	setSwaps: (params: { swaps: SwapProviderResult[]; amount: OptionAmount }) => void;
	reset: () => void;
	setSelectedProvider: (provider: SwapProvider) => void;
}

export const initSwapAmountsStore = (): SwapAmountsStore => {
	const { subscribe, set, update } = writable<Option<SwapAmountsStoreData>>(undefined);

	return {
		subscribe,

		reset() {
			set(null);
		},

		setSwaps({ swaps, amount }) {
			set({
				swaps,
				amountForSwap: amount
			});
		},

		setSelectedProvider(provider: SwapProvider) {
			update((data) => {
				if (!data) {
					return data;
				}
				return { ...data, selectedProvider: provider };
			});
		}
	};
};

export const swapAmountsStore = initSwapAmountsStore();

export interface SwapAmountsContext {
	store: SwapAmountsStore;
}

export const SWAP_AMOUNTS_CONTEXT_KEY = Symbol('swap-amounts');

export const swapAmountsContext: SwapAmountsContext = {
	store: swapAmountsStore
};
