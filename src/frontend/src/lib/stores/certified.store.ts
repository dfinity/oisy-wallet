import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable, type Writable } from 'svelte/store';

export type WritableUpdateStore<T, Id extends symbol = TokenId> = Pick<
	Writable<CertifiedStoreData<T, Id>>,
	'update'
>;

export type CertifiedStoreData<T, Id extends symbol = TokenId> = Record<Id, T | null> | undefined;

export interface CertifiedStore<T, Id extends symbol = TokenId>
	extends Readable<CertifiedStoreData<T, Id>> {
	reset: (id: Id) => void;
	resetAll: () => void;
}

export const initCertifiedStore = <T, Id extends symbol = TokenId>(): CertifiedStore<T, Id> &
	WritableUpdateStore<T, Id> => {
	const { update, subscribe, set } = writable<CertifiedStoreData<T, Id>>(undefined);

	return {
		update,
		subscribe,
		reset: (id: Id) =>
			update(
				(state) =>
					({
						...(nonNullish(state) && state),
						[id]: null
					}) as CertifiedStoreData<T, Id>
			),
		resetAll: () => set(undefined)
	};
};
