import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable, type Writable } from 'svelte/store';

export type WritableUpdateStore<T> = Pick<Writable<CertifiedStoreData<T>>, 'update'>;

export type CertifiedStoreData<T> = Record<TokenId, T | null> | undefined;

export interface CertifiedStore<T> extends Readable<CertifiedStoreData<T>> {
	reset: (tokenId: TokenId) => void;
}

export const initCertifiedStore = <T>(): CertifiedStore<T> & WritableUpdateStore<T> => {
	const { update, subscribe } = writable<CertifiedStoreData<T>>(undefined);

	return {
		update,
		subscribe,
		reset: (tokenId: TokenId) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: null
			}))
	};
};
