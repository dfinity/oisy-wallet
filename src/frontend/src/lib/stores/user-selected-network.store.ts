import { writable } from 'svelte/store';

export const userSelectedNetworkStore = writable<string | undefined>(undefined);
