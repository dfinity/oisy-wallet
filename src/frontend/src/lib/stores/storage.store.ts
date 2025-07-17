import { del, get, set as setStorage } from '$lib/utils/storage.utils';
import { writable, type Writable } from 'svelte/store';

type StorageStoreData<T> = T;

export interface StorageStore<T> extends Omit<Writable<StorageStoreData<T>>, 'set'> {
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

	const { set, subscribe, update } = writable<StorageStoreData<T>>(initialValue);

	return {
		set: ({ key, value }) => {
			setStorage({ key, value });
			set(value);
		},
		subscribe,
		update,
		reset: (params) => {
			del(params);
			set(defaultValue);
		}
	};
};
