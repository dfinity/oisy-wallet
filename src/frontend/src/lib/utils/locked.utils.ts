import * as localStore from '$lib/utils/storage.utils';
import { writable } from 'svelte/store';

const KEY = 'lockedPageShow';

const initial = localStore.get<boolean>({ key: KEY }) ?? false;

export const lockedPageShow = writable<boolean>(initial);

lockedPageShow.subscribe((value) => {
	localStore.set({ key: KEY, value });
});
