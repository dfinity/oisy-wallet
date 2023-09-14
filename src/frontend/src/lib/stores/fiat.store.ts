import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type FiatValue = Record<TokenId, number | undefined> | undefined | null;

export interface FiatStore extends Readable<FiatValue> {
	set: (params: { tokenId: TokenId; fiatBalance: number }) => void;
	reset: () => void;
}

const initFiatStore = (): FiatStore => {
	const { subscribe, set, update } = writable<FiatValue>(undefined);

	return {
		set: ({ tokenId, fiatBalance }: { tokenId: TokenId; fiatBalance: number | undefined }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: fiatBalance
			})),
		reset: () => set(undefined),
		subscribe
	};
};

export const fiatStore = initFiatStore();
