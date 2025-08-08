import * as localStore from '$lib/utils/storage.utils';
import { writable } from 'svelte/store';

const KEY = 'authLocked';

const initial = localStore.get<boolean>({ key: KEY }) ?? false;

export const authLocked = writable<boolean>(initial);

authLocked.subscribe((value) => {
	localStore.set({ key: KEY, value });
});
