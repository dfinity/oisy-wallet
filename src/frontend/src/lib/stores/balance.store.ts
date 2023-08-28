import { isNullish, nonNullish } from '@dfinity/utils';
import type { BigNumber } from 'alchemy-sdk';
import { derived, writable, type Readable } from 'svelte/store';

export type BalanceData = BigNumber | undefined | null;

export interface BalanceStore extends Readable<BalanceData> {
	set: (balance: BigNumber) => void;
	reset: () => void;
}

const initBalanceStore = (): BalanceStore => {
	const { subscribe, set } = writable<BalanceData>(undefined);

	return {
		set: (balance: BigNumber) => set(balance),
		reset: () => set(null),
		subscribe
	};
};

export const balanceStore = initBalanceStore();

export const balanceStoreEmpty: Readable<boolean> = derived(
	[balanceStore],
	([$balanceStore]) => isNullish($balanceStore) || $balanceStore.isZero()
);

export const balanceStoreZero: Readable<boolean> = derived(
	[balanceStore],
	([$balanceStore]) => nonNullish($balanceStore) && $balanceStore.isZero()
);
