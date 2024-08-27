import { writable } from 'svelte/store';

export const pointerEventStore = writable<boolean>(false);
