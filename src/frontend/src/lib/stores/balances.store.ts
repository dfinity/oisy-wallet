import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';

export type BalancesData = CertifiedData<BigNumber>;

export interface BalancesStore extends CertifiedStore<BalancesData> {
	set: (params: { tokenId: TokenId; balance: BalancesData }) => void;
}

const initBalancesStore = (): BalancesStore => {
	const { subscribe, update, reset } = initCertifiedStore<BalancesData>();

	return {
		set: ({ tokenId, balance }: { tokenId: TokenId; balance: BalancesData }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: balance
			})),
		reset,
		subscribe
	};
};

export const balancesStore = initBalancesStore();
