import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from 'alchemy-sdk';
import { writable, type Readable } from 'svelte/store';

export type BalancesData = Record<TokenId, BigNumber> | undefined | null;

export interface BalancesStore extends Readable<BalancesData> {
	set: (params: { tokenId: TokenId; balance: BigNumber }) => void;
	reset: () => void;
}

const initBalancesStore = (): BalancesStore => {
	const { subscribe, set, update } = writable<BalancesData>(undefined);

	return {
		set: ({ tokenId, balance }: { tokenId: TokenId; balance: BigNumber }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: balance
			})),
		reset: () => set(null),
		subscribe
	};
};

export const balancesStore = initBalancesStore();
