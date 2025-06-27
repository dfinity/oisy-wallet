import { maxGasFee as maxGasFeeUtils, minGasFee as minGasFeeUtils } from '$eth/utils/fee.utils';
import type { TokenId } from '$lib/types/token';
import type { TransactionFeeData } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable, type Writable } from 'svelte/store';

export type FeeStoreData = TransactionFeeData | undefined;

export interface EthFeeStore extends Readable<FeeStoreData> {
	setFee: (data: TransactionFeeData) => void;
}

export const initEthFeeStore = (): EthFeeStore => {
	const { subscribe, set } = writable<FeeStoreData>(undefined);

	return {
		subscribe,

		setFee: (data: TransactionFeeData) => {
			set(data);
		}
	};
};

export interface EthFeeContext {
	feeStore: EthFeeStore;
	feeSymbolStore: Writable<string | undefined>;
	feeTokenIdStore: Writable<TokenId | undefined>;
	feeDecimalsStore: Writable<number | undefined>;
	maxGasFee: Readable<bigint | undefined>;
	minGasFee: Readable<bigint | undefined>;
	feeExchangeRateStore?: Writable<number | undefined>;
	evaluateFee?: () => void;
}

export const initEthFeeContext = ({
	feeStore,
	...rest
}: Omit<EthFeeContext, 'maxGasFee' | 'minGasFee'>): EthFeeContext => {
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

export const ETH_FEE_CONTEXT_KEY = Symbol('eth-fee');
