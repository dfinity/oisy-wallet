import type { TokenId } from '$lib/types/token';
import { writable, type Readable } from 'svelte/store';

// Ethereum repay transfers broadcast but not yet reflected in their token's balance, keyed by
// transaction hash. In memory: a page reload while one is unmined drops it, and the balance then
// holds the amount until that transfer is mined and the balance next loads.
export type LiquidiumUnminedRepaysData = Record<string, { tokenId: TokenId; amount: bigint }>;

export interface LiquidiumUnminedRepaysStore extends Readable<LiquidiumUnminedRepaysData> {
	add: (params: { hash: string; tokenId: TokenId; amount: bigint }) => void;
	remove: (hash: string) => void;
	reset: () => void;
}

const initLiquidiumUnminedRepaysStore = (): LiquidiumUnminedRepaysStore => {
	const { subscribe, set, update } = writable<LiquidiumUnminedRepaysData>({});

	return {
		subscribe,
		add: ({ hash, tokenId, amount }) =>
			update((state) => ({ ...state, [hash]: { tokenId, amount } })),
		remove: (hash) =>
			update((state) => {
				const { [hash]: _removed, ...rest } = state;

				return rest;
			}),
		reset: () => set({})
	};
};

export const liquidiumUnminedRepaysStore = initLiquidiumUnminedRepaysStore();
