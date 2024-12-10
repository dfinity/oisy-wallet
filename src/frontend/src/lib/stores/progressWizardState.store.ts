import { writable } from 'svelte/store';

export const dirtyWizardState = writable<boolean>(false);
