import type { Option } from '$lib/types/utils';
import { del, get, set as setStorage } from '$lib/utils/storage.utils';
import { writable, type Readable } from 'svelte/store';

export type StorageStoreData<T> = Option<T>;

export interface StorageStore<T> extends Readable<StorageStoreData<T>> {
	set: (params: { key: string; value: T }) => void;
	reset: (params: { key: string }) => void;
}

export const initStorageStore = <T>({ key }: { key: string }): StorageStore<T> => {
	const initialValue = get<T>({ key });

	const { set, subscribe } = writable<StorageStoreData<T>>(initialValue);

	return {
		set: ({ key, value }) => {
			setStorage({ key, value });
			set(value);
		},
		subscribe,
		reset: (params) => {
			del(params);
			set(null);
		}
	};
};
