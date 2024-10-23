import { nonNullish } from '@dfinity/utils';
import { writable, type Readable, type Writable } from 'svelte/store';

export type WritableUpdateStore<T> = Pick<Writable<CertifiedStoreData<T>>, 'update'>;

export type CertifiedStoreData<T> = Record<symbol, T | null> | undefined;

export interface CertifiedStore<K extends symbol, T> extends Readable<CertifiedStoreData<T>> {
	reset: (id: K) => void;
}

export const initCertifiedStore = <K extends symbol, T>(): CertifiedStore<K, T> & WritableUpdateStore<T> => {
	const { update, subscribe } = writable<CertifiedStoreData<T>>(undefined);

	return {
		update,
		subscribe,
		reset: (id: K) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[id]: null
			}))
	};
};
