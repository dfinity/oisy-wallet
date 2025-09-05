import {
	initCertifiedStore,
	type CertifiedStore,
	type CertifiedStoreData,
	type WritableUpdateStore
} from '$lib/stores/certified.store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export interface CertifiedSetterStoreStore<T, Id extends symbol = TokenId>
	extends CertifiedStore<T, Id> {
	set: (params: { id: Id; data: T }) => void;
}

export const initCertifiedSetterStore = <
	T,
	Id extends symbol = TokenId
>(): CertifiedSetterStoreStore<T, Id> & WritableUpdateStore<T, Id> => {
	const { subscribe, update, reset, reinitialize } = initCertifiedStore<T, Id>();

	return {
		set: ({ id, data }: { id: Id; data: T }) =>
			update(
				(state) =>
					({
						...(nonNullish(state) && state),
						[id]: data
					}) as CertifiedStoreData<T, Id>
			),
		update,
		reset,
		reinitialize,
		subscribe
	};
};
