import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable, type Writable } from 'svelte/store';

export type WritableUpdateStore<T> = Pick<Writable<SetterStoreData<T>>, 'update'>;

export type SetterStoreData<T> = Record<TokenId, T | null> | undefined;

export interface SetterStoreStore<T> extends Readable<SetterStoreData<T>> {
	reset: (tokenId: TokenId) => void;
	set: (params: { tokenId: TokenId; data: T }) => void;
}

export const initSetterStore = <T>(): SetterStoreStore<T> & WritableUpdateStore<T> => {
	const { subscribe, update } = writable<SetterStoreData<T>>(undefined);

	return {
		set: ({ tokenId, data }: { tokenId: TokenId; data: T }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: data
			})),
		reset: (tokenId: TokenId) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: null
			})),
		update,
		subscribe
	};
};
