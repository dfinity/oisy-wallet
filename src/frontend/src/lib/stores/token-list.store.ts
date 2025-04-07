import { writable } from 'svelte/store';

export interface TokenListStoreData {
	filter: string;
}

export const tokenListStore = writable<TokenListStoreData>({ filter: '' });
