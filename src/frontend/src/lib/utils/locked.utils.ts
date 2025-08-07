import { writable } from 'svelte/store';
import * as localStore from '$lib/utils/storage.utils';

const KEY = 'lockedPageShow';

const initial = localStore.get<boolean>({ key: KEY }) ?? false;

export const lockedPageShow = writable<boolean>(initial);

lockedPageShow.subscribe((value) => {
  localStore.set({ key: KEY, value });
});
