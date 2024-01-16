import type { TokenId } from '$lib/types/token';
import { writable, type Readable, type Writable } from 'svelte/store';

export type CertifiedStoreData<T> = Record<TokenId, T> | undefined;

export interface CertifiedStore<T> extends Readable<CertifiedStoreData<T>> {
	reset: (tokenId: TokenId) => void;
}

export const initCertifiedStore = <T>(): Omit<CertifiedStore<T>, 'set'> &
	Pick<Writable<CertifiedStoreData<T>>, 'update'> => {
	const { subscribe, update } = writable<CertifiedStoreData<T>>(undefined);

	return {
		update,
		reset: (tokenId: TokenId) =>
			update((state) => {
				const { [tokenId]: _, ...rest } = state ?? {};
				return rest;
			}),
		subscribe
	};
};
