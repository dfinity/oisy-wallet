import { maxGasFee as maxGasFeeUtils, minGasFee as minGasFeeUtils } from '$eth/utils/fee.utils';
import type { TransactionFeeData } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { derived, writable, type Readable, type Writable } from 'svelte/store';

export type FeeStoreData = TransactionFeeData | undefined;

export interface FeeStore extends Readable<FeeStoreData> {
	setFee: (data: TransactionFeeData) => void;
}

export const initFeeStore = (): FeeStore => {
	const { subscribe, set } = writable<FeeStoreData>(undefined);

	return {
		subscribe,

		setFee(data: TransactionFeeData) {
			set(data);
		}
	};
};

export interface FeeContext {
	feeStore: FeeStore;
	feeSymbolStore: Writable<string | undefined>;
	maxGasFee: Readable<BigNumber | undefined>;
	minGasFee: Readable<BigNumber | undefined>;
	evaluateFee?: () => void;
}

export const initFeeContext = ({
	feeStore,
	...rest
}: Omit<FeeContext, 'maxGasFee' | 'minGasFee'>): FeeContext => {
	const maxGasFee = derived(feeStore, (feeData) =>
		nonNullish(feeData) ? maxGasFeeUtils(feeData) : undefined
	);
	const minGasFee = derived(feeStore, (feeData) =>
		nonNullish(feeData) ? minGasFeeUtils(feeData) : undefined
	);

	return {
		feeStore,
		maxGasFee,
		minGasFee,
		...rest
	};
};

export const FEE_CONTEXT_KEY = Symbol('fee');
