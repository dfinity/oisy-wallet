import { writable } from 'svelte/store';

interface TokenListStoreData {
	filter: string;
}

export const tokenListStore = writable<TokenListStoreData>({ filter: '' });
