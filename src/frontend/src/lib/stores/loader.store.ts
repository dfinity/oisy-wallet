import { writable } from 'svelte/store';

export const initialLoading = writable<boolean>(true);
