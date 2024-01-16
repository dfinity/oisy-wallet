import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { writable, type Readable } from 'svelte/store';

export type BalancesData = Record<TokenId, CertifiedData<BigNumber>> | undefined | null;

export interface BalancesStore extends Readable<BalancesData> {
	set: (params: { tokenId: TokenId; balance: CertifiedData<BigNumber> }) => void;
	reset: () => void;
}

const initBalancesStore = (): BalancesStore => {
	const { subscribe, set, update } = writable<BalancesData>(undefined);

	return {
		set: ({ tokenId, balance }: { tokenId: TokenId; balance: CertifiedData<BigNumber> }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: balance
			})),
		reset: () => set(null),
		subscribe
	};
};

export const balancesStore = initBalancesStore();
