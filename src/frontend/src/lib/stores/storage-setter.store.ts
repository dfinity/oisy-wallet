import { initStorageStore } from '$lib/stores/storage.store';
import type { TokenId } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import { type Readable } from 'svelte/store';

export type StorageSetterStoreData<T> = Option<Record<TokenId, T | null>>;

export interface StorageSetterStore<T> extends Readable<StorageSetterStoreData<T>> {
	set: (params: { tokenId: TokenId; data: T }) => void;
	reset: (tokenId: TokenId) => void;
	resetAll: (params: { key: string }) => void;
}

export const initStorageSetterStore = <T>({ key }: { key: string }): StorageSetterStore<T> => {
	const { set, subscribe, update, reset } = initStorageStore<StorageSetterStoreData<T>>({ key });

	return {
		set: ({ tokenId, data }: { tokenId: TokenId; data: T }) =>
			update((state) => {
				const newState: StorageSetterStoreData<T> = {
					...state,
					[tokenId]: data
				};

				set({ key, value: newState });

				return newState;
			}),
		reset: (tokenId: TokenId) =>
			update((state) => {
				const newState = {
					...state,
					[tokenId]: null
				};

				set({ key, value: newState });

				return newState;
			}),
		resetAll: reset,
		subscribe
	};
};
