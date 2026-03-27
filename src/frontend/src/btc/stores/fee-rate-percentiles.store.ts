import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export type FeeRatePercentilesStoreData = Nullish<{
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

export const feeRatePercentilesStore = initFeeRatePercentilesStore();
