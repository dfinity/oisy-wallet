import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { OptionAmount } from '$lib/types/send';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type SwapAmountsStoreData = Option<{
	swapAmounts?: {
		slippage: SwapAmountsReply['slippage'];
		receiveAmount: SwapAmountsReply['receive_amount'];
		liquidityProvidersFee?: bigint;
		gasFee?: bigint;
	} | null;
	// We need to save the inputted amount for which swap-amounts have been already fetched.
	// It allows us to compare it with the new value to prevent a re-fetch on consumer component re-render.
	amountForSwap?: OptionAmount;
}>;

export interface SwapAmountsStore extends Readable<SwapAmountsStoreData> {
	setSwapAmounts: (data: SwapAmountsStoreData) => void;
	reset: () => void;
}

export const initSwapAmountsStore = (): SwapAmountsStore => {
	const { subscribe, set } = writable<SwapAmountsStoreData>(undefined);

	return {
		subscribe,

		reset() {
			set(null);
		},

		setSwapAmounts(data: SwapAmountsStoreData) {
			set(data);
		}
	};
};

export interface SwapAmountsContext {
	store: SwapAmountsStore;
}

export const SWAP_AMOUNTS_CONTEXT_KEY = Symbol('swap-amounts');
