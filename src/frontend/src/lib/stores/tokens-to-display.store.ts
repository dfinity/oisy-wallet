import { writable } from 'svelte/store';

export const tokensKeysStore = writable<string[]>([]);
