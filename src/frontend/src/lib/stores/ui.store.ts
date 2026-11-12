import { writable } from 'svelte/store';

// Stays true until the last blocking overlay has finished its exit transition.
export const blockingOverlayOpenStore = writable(false);

export const bottomSheetOpenStore = writable<boolean>(false);
