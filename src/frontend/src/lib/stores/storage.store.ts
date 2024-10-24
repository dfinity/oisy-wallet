import { del, get, set as setStorage } from '$icp/utils/storage.utils';
import type { Option } from '$lib/types/utils';
import { writable, type Readable, type Writable } from 'svelte/store';

export type StorageStoreData<T> = Option<T>;

export interface StorageStore<T>
	extends Readable<StorageStoreData<T>>,
		Pick<Writable<StorageStoreData<T>>, 'update'> {
	set: (params: { key: string; value: T }) => void;
	reset: (params: { key: string }) => void;
}

export const initStorageStore = <T>({ key }: { key: string }): StorageStore<T> => {
	const initialValue = get<T>({ key });

	const { set, subscribe, update } = writable<StorageStoreData<T>>(initialValue);

	return {
		set: ({ key, value }) => {
			setStorage({ key, value });
			set(value);
		},
		update,
		subscribe,
		reset: (params) => {
			del(params);
			set(null);
		}
	};
};
