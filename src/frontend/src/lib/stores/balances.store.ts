import type { Token } from '$lib/enums/token';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from 'alchemy-sdk';
import { writable, type Readable } from 'svelte/store';

export type BalancesData = Record<Token, BigNumber> | undefined | null;

export interface BalancesStore extends Readable<BalancesData> {
	set: (params: { token: Token; balance: BigNumber }) => void;
	reset: () => void;
}

const initBalancesStore = (): BalancesStore => {
	const { subscribe, set, update } = writable<BalancesData>(undefined);

	return {
		set: ({ token, balance }: { token: Token; balance: BigNumber }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[token]: balance
			})),
		reset: () => set(null),
		subscribe
	};
};

export const balancesStore = initBalancesStore();
