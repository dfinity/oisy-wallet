import { writable } from 'svelte/store';

export const currentTokensKeysStore = writable<string[]>([]);
