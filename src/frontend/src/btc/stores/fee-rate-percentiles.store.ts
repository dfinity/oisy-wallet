import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type FeeRatePercentilesStoreData = Option<{
	feeRateFromPercentiles?: bigint;
}>;

export interface FeeRatePercentilesStore extends Readable<FeeRatePercentilesStoreData> {
	setFeeRateFromPercentiles: (data: FeeRatePercentilesStoreData) => void;
	reset: () => void;
}

export const initFeeRatePercentilesStore = (): FeeRatePercentilesStore => {
	const { subscribe, set } = writable<FeeRatePercentilesStoreData>();

	return {
		subscribe,

		reset: () => {
			set(null);
		},

		setFeeRateFromPercentiles: (data: FeeRatePercentilesStoreData) => {
			set(data);
		}
	};
};

export interface FeeRatePercentilesContext {
	store: FeeRatePercentilesStore;
}

export const FEE_RATE_PERCENTILES_CONTEXT_KEY = Symbol('fee-rate-percentiles');
