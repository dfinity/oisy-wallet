import type { TokenId } from '$lib/types/token';
import { writable, type Readable, type Writable } from 'svelte/store';

export type FeeStoreData = bigint | undefined;

export interface FeeStore extends Readable<FeeStoreData> {
	setFee: (data: bigint | undefined) => void;
}

export const initFeeStore = (): FeeStore => {
	const { subscribe, set } = writable<FeeStoreData>(undefined);

	return {
		subscribe,
		setFee: (data: bigint | undefined) => {
			set(data);
		}
	};
};

export interface XrpFeeContext {
	feeStore: FeeStore;
	feeSymbolStore: Writable<string | undefined>;
	feeDecimalsStore: Writable<number | undefined>;
	feeTokenIdStore: Writable<TokenId | undefined>;
	feeExchangeRateStore: Writable<number | undefined>;
}

export const initXrpFeeContext = (params: XrpFeeContext): XrpFeeContext => params;

export const XRP_FEE_CONTEXT_KEY = Symbol('xrp-fee');
