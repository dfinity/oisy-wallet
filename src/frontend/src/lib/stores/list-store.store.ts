import type { ListVariant } from '$lib/types/style';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type ListStoreData = Option<{
	variant: ListVariant;
	condensed?: boolean;
	noPadding?: boolean;
	noBorder?: boolean;
	itemStyleClass?: string;
}>;

export interface ListStore extends Readable<ListStoreData> {
	setList: (data: ListStoreData) => void;
}

export const initListStore = (): ListStore => {
	const { subscribe, set } = writable<ListStoreData>(undefined);

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
