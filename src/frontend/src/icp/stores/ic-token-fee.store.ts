import { nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { type Readable, writable } from 'svelte/store';

export type IcTokenFeeStoreData = Nullish<Record<string, bigint>>;

interface SetIcTokenFeeParams {
	tokenSymbol: string;
	fee: bigint;
}

export interface IcTokenFeeStore extends Readable<IcTokenFeeStoreData> {
	setIcTokenFee: (params: SetIcTokenFeeParams) => void;
	reset: () => void;
}

const initIcTokenFeeStore = (): IcTokenFeeStore => {
	const { subscribe, set, update } = writable<IcTokenFeeStoreData>(undefined);

	return {
		subscribe,

		reset: () => set(null),

		setIcTokenFee: ({ tokenSymbol, fee }: SetIcTokenFeeParams) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenSymbol]: fee
			}))
	};
};

export interface IcTokenFeeContext {
	store: IcTokenFeeStore;
}

export const IC_TOKEN_FEE_CONTEXT_KEY = Symbol('ic-token-fee');

// the store is global to cache already loaded token fees
export const icTokenFeeStore = initIcTokenFeeStore();
