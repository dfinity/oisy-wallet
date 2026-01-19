import type { ListVariant } from '$lib/types/style';
import { writable, type Readable } from 'svelte/store';

export interface ListStoreData {
	variant: ListVariant;
	condensed?: boolean;
	noPadding?: boolean;
	noBorder?: boolean;
	itemStyleClass?: string;
}

export interface ListStore extends Readable<ListStoreData> {
	setList: (data: ListStoreData) => void;
}

export const initListStore = (): ListStore => {
	const { subscribe, set } = writable<ListStoreData>({ variant: 'styled' });

	return {
		subscribe,

		setList: (data: ListStoreData) => {
			set(data);
		}
	};
};

export interface ListContext {
	store: ListStore;
}

export const LIST_CONTEXT_KEY = Symbol('list-context');
