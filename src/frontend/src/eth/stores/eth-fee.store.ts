import type { EthFeePriorities } from '$eth/types/fee';
import {
	estimatedGasFee as estimatedGasFeeUtils,
	maxGasFee as maxGasFeeUtils,
	minGasFee as minGasFeeUtils
} from '$eth/utils/fee.utils';
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
	estimatedGasFee: Readable<bigint | undefined>;
	// Every priority from the latest fee sample, so the selector can price all of them without a
	// round trip per selection. Undefined where the network offers no choice.
	feePrioritiesStore: Writable<EthFeePriorities | undefined>;
	feeExchangeRateStore?: Writable<number | undefined>;
	evaluateFee?: () => void;
}

export const initEthFeeContext = ({
	feeStore,
	...rest
}: Omit<
	EthFeeContext,
	'maxGasFee' | 'minGasFee' | 'estimatedGasFee' | 'feePrioritiesStore'
>): EthFeeContext => {
	const maxGasFee = derived(feeStore, (feeData) =>
		nonNullish(feeData) ? maxGasFeeUtils(feeData) : undefined
	);
	const minGasFee = derived(feeStore, (feeData) =>
		nonNullish(feeData) ? minGasFeeUtils(feeData) : undefined
	);
	const estimatedGasFee = derived(feeStore, (feeData) =>
		nonNullish(feeData) ? estimatedGasFeeUtils(feeData) : undefined
	);

	const feePrioritiesStore = writable<EthFeePriorities | undefined>(undefined);

	return {
		feeStore,
		maxGasFee,
		minGasFee,
		estimatedGasFee,
		feePrioritiesStore,
		...rest
	};
};

export const ETH_FEE_CONTEXT_KEY = Symbol('eth-fee');
