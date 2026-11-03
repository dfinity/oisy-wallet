import type { TokenId } from '$lib/types/token';
import { writable, type Readable } from 'svelte/store';

// What Ethereum repays broadcast but not yet mined still hold of OISY's balances, keyed by
// transaction hash: the transferred value of the sent token and the gas of the native token. In
// memory: a page reload while one is unmined drops it, and the balances then hold it until that
// transfer is mined and they next load.
export interface LiquidiumUnminedRepayHold {
	tokenId: TokenId;
	amount: bigint;
}

export type LiquidiumUnminedRepaysData = Record<string, LiquidiumUnminedRepayHold[]>;

export interface LiquidiumUnminedRepaysStore extends Readable<LiquidiumUnminedRepaysData> {
	add: (params: { hash: string; holds: LiquidiumUnminedRepayHold[] }) => void;
	remove: (hash: string) => void;
	reset: () => void;
}

const initLiquidiumUnminedRepaysStore = (): LiquidiumUnminedRepaysStore => {
	const { subscribe, set, update } = writable<LiquidiumUnminedRepaysData>({});

	return {
		subscribe,
		add: ({ hash, holds }) => update((state) => ({ ...state, [hash]: holds })),
		remove: (hash) =>
			update((state) => {
				const { [hash]: _removed, ...rest } = state;

				return rest;
			}),
		reset: () => set({})
	};
};

export const liquidiumUnminedRepaysStore = initLiquidiumUnminedRepaysStore();
