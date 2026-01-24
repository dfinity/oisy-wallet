import type { KaspaUtxosFee } from '$kaspa/types/kaspa-send';
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

export type UtxosFeeStoreData = KaspaUtxosFee | undefined;

export interface UtxosFeeStore extends Readable<UtxosFeeStoreData> {
	setUtxosFee: (data: KaspaUtxosFee | undefined) => void;
}

export const initUtxosFeeStore = (): UtxosFeeStore => {
	const { subscribe, set } = writable<UtxosFeeStoreData>(undefined);

	return {
		subscribe,
		setUtxosFee: (data: KaspaUtxosFee | undefined) => {
			set(data);
		}
	};
};

export interface KaspaFeeContext {
	feeStore: FeeStore;
	utxosFeeStore: UtxosFeeStore;
	feeSymbolStore: Writable<string | undefined>;
	feeDecimalsStore: Writable<number | undefined>;
	feeTokenIdStore: Writable<TokenId | undefined>;
	feeExchangeRateStore: Writable<number | undefined>;
}

export const initKaspaFeeContext = (params: KaspaFeeContext): KaspaFeeContext => params;

export const KASPA_FEE_CONTEXT_KEY = Symbol('kaspa-fee');
