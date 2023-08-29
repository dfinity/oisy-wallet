import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export interface Tab {
	id: symbol;
	labelKey: string;
}

export interface TabsStoreData {
	tabId: symbol;
	tabs: Tab[];
}

export interface TabsStore extends Readable<TabsStoreData> {
	select: (id: symbol) => void;
}

export const initTabsStore = (initialData: TabsStoreData): TabsStore => {
	const { subscribe, update } = writable<TabsStoreData>(initialData);

	return {
		subscribe,

		select(id: symbol) {
			update((data) => ({ ...data, tabId: id }));
		}
	};
};

export interface TabsContext {
	store: TabsStore;
}

export const TABS_CONTEXT_KEY = Symbol('tabs');
