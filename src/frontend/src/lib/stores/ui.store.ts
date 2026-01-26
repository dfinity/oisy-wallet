import { writable } from 'svelte/store';

export const bottomSheetOpenStore = writable<boolean>(false);
