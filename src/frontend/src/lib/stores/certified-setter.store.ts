import {
	initCertifiedStore,
	type CertifiedStore,
	type WritableUpdateStore
} from '$lib/stores/certified.store';
import { nonNullish } from '@dfinity/utils';

export interface CertifiedSetterStoreStore<K extends symbol, T> extends CertifiedStore<K, T> {
	set: (params: { id: K; data: T }) => void;
}

export const initCertifiedSetterStore = <K extends symbol, T>(): CertifiedSetterStoreStore<K, T> &
	WritableUpdateStore<T> => {
	const { subscribe, update, reset } = initCertifiedStore<K, T>();

	return {
		set: ({ id, data }: { id: K; data: T }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[id]: data
			})),
		update,
		reset,
		subscribe
	};
};
