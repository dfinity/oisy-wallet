import { del, get, set as setStorage } from '$lib/utils/storage.utils';
import { writable, type Readable } from 'svelte/store';

type StorageStoreData<T> = T;

export interface StorageStore<T> extends Readable<StorageStoreData<T>> {
	set: (params: { key: string; value: T }) => void;
	reset: (params: { key: string }) => void;
}

export const initStorageStore = <T>({
	key,
	defaultValue
}: {
	key: string;
	defaultValue: T;
}): StorageStore<T> => {
	const initialValue = get<T>({ key }) ?? defaultValue;

	const { set, subscribe } = writable<StorageStoreData<T>>(initialValue);

	return {
		set: ({ key, value }) => {
			setStorage({ key, value });
			set(value);
		},
		subscribe,
		reset: (params) => {
			del(params);
			set(defaultValue);
		}
	};
};
