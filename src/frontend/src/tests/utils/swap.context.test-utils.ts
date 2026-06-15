import {
	initSwapAmountsStore,
	SWAP_AMOUNTS_CONTEXT_KEY,
	type SwapAmountsStore
} from '$lib/stores/swap-amounts.store';
import { initSwapContext, SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
import type { MockContextEntry } from '$tests/utils/context.test-utils';

export const mockSwapContext = (params?: Parameters<typeof initSwapContext>[0]): SwapContext =>
	initSwapContext(params);

export const mockSwapContextEntry = (
	params?: Parameters<typeof initSwapContext>[0]
): MockContextEntry => [SWAP_CONTEXT_KEY, mockSwapContext(params)];

export const mockSwapAmountsContextEntry = (
	store: SwapAmountsStore = initSwapAmountsStore()
): MockContextEntry => [SWAP_AMOUNTS_CONTEXT_KEY, { store }];
