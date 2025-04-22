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
	raw: unknown;
}

export interface SwapAmountsStoreData {
	swaps: SwapProviderResult[];
	amountForSwap?: OptionAmount;
}

export interface SwapAmountsStore extends Readable<Option<SwapAmountsStoreData>> {
	setSwaps: (params: { swaps: SwapProviderResult[]; amount: OptionAmount }) => void;
	reset: () => void;
}

export const initSwapAmountsStore = (): SwapAmountsStore => {
	const { subscribe, set } = writable<Option<SwapAmountsStoreData>>(undefined);

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
